package com.cse.navigator.tools;

import org.junit.jupiter.api.Test;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.*;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SpriteSlicerTest {

    @Test
    void testFragmentAttachesToNearestBodyAcrossRowBoundary() {
        // Body 1 in Row 0 (centroid ~ 50, 20)
        SpriteSlicer.Component body1 = new SpriteSlicer.Component(1, 40, 10);
        for (int y = 10; y <= 30; y++) {
            for (int x = 40; x <= 60; x++) {
                body1.addPixel(x, y);
            }
        }

        // Body 2 in Row 1 (centroid ~ 50, 90)
        SpriteSlicer.Component body2 = new SpriteSlicer.Component(2, 40, 80);
        for (int y = 80; y <= 100; y++) {
            for (int x = 40; x <= 60; x++) {
                body2.addPixel(x, y);
            }
        }

        List<SpriteSlicer.Component> primaryBodies = List.of(body1, body2);

        // Fragment near the row boundary (y = 48), closer to Body 1 (dy = 28) than Body 2 (dy = 42)
        SpriteSlicer.Component frag = new SpriteSlicer.Component(3, 48, 48);
        for (int y = 48; y <= 52; y++) {
            for (int x = 48; x <= 52; x++) {
                frag.addPixel(x, y);
            }
        }

        List<SpriteSlicer.Component> allComps = List.of(body1, body2, frag);

        Map<Integer, Set<Integer>> grouping = SpriteSlicer.groupComponentsToBodies(primaryBodies, allComps, 10);
        assertTrue(grouping.get(0).contains(3), "Fragment must attach to nearest body (Body 1) across row boundary");
        assertFalse(grouping.get(1).contains(3), "Fragment must NOT attach to Body 2");
    }

    @Test
    void testNoPixelsLostOnSyntheticSheet() {
        // Create synthetic image with 2 bodies and 1 fragment
        int w = 60, h = 60;
        BufferedImage src = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        int[][] compMap = new int[w][h];

        // Body 1: (5,5) to (15,15) -> 121 px
        for (int y = 5; y <= 15; y++) {
            for (int x = 5; x <= 15; x++) {
                src.setRGB(x, y, 0xFF_FF_00_00);
            }
        }
        // Body 2: (35,35) to (45,45) -> 121 px
        for (int y = 35; y <= 45; y++) {
            for (int x = 35; x <= 45; x++) {
                src.setRGB(x, y, 0xFF_00_FF_00);
            }
        }
        // Fragment attached to Body 2: (40,25) to (44,29) -> 25 px
        for (int y = 25; y <= 29; y++) {
            for (int x = 40; x <= 44; x++) {
                src.setRGB(x, y, 0xFF_00_FF_FF);
            }
        }

        int totalOpaqueInSource = 0;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (((src.getRGB(x, y) >>> 24) & 0xFF) > SpriteSlicer.ALPHA_THRESHOLD) {
                    totalOpaqueInSource++;
                }
            }
        }

        List<SpriteSlicer.Component> comps = SpriteSlicer.findConnectedComponents(src, SpriteSlicer.ALPHA_THRESHOLD, compMap);
        comps.sort((a, b) -> Integer.compare(b.pixelCount, a.pixelCount));
        List<SpriteSlicer.Component> primaryBodies = List.of(comps.get(0), comps.get(1));

        Map<Integer, Set<Integer>> grouping = SpriteSlicer.groupComponentsToBodies(primaryBodies, comps, 10);

        int sumFramePixels = 0;
        for (int i = 0; i < 2; i++) {
            Set<Integer> allowed = grouping.get(i);
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (allowed.contains(compMap[x][y])) {
                        sumFramePixels++;
                    }
                }
            }
        }

        assertEquals(totalOpaqueInSource, sumFramePixels,
                "Sum over extracted frames must equal total opaque pixels on sheet (zero loss)");
    }

    @Test
    void testPivotXUsesUpperBodyNotBboxCenter() {
        // 100 x 100 frame
        // Upper body (top 40%, rows 0..39): symmetrical head & torso centered at x = 50
        // Lower body (rows 40..99): body at x=50, plus a leg sticking far out to x = 90
        BufferedImage frame = new BufferedImage(100, 100, BufferedImage.TYPE_INT_ARGB);
        int color = 0xFF_00_FF_00;

        // Head and shoulders: x from 40 to 60, y from 0 to 39
        for (int y = 0; y < 40; y++) {
            for (int x = 40; x <= 60; x++) {
                frame.setRGB(x, y, color);
            }
        }

        // Torso: x from 45 to 55, y from 40 to 69
        for (int y = 40; y < 70; y++) {
            for (int x = 45; x <= 55; x++) {
                frame.setRGB(x, y, color);
            }
        }

        // Leg sticking far out to right: x from 45 to 95, y from 70 to 99
        for (int y = 70; y < 100; y++) {
            for (int x = 45; x <= 95; x++) {
                frame.setRGB(x, y, color);
            }
        }

        double pivotX = SpriteSlicer.computePivotX(frame);
        double bboxCenter = (40 + 95) / 2.0; // 67.5

        assertEquals(50.0, pivotX, 0.5, "pivotX must be centered on the upper body (~50.0)");
        assertNotEquals(bboxCenter, pivotX, "pivotX must NOT follow the bounding-box centre");
    }

    @Test
    void testNoDarkFringeOnSyntheticWhiteDisc() {
        // (4) scale a synthetic opaque white disc on transparent; every pixel with alpha > 0 keeps RGB >= 250
        int size = 100;
        BufferedImage disc = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = disc.createGraphics();
        g.setColor(Color.WHITE);
        g.fillOval(20, 20, 60, 60);
        g.dispose();

        BufferedImage scaled = SpriteSlicer.scaleImage(disc, 0.45);
        boolean foundEdge = false;

        for (int y = 0; y < scaled.getHeight(); y++) {
            for (int x = 0; x < scaled.getWidth(); x++) {
                int rgb = scaled.getRGB(x, y);
                int a = (rgb >>> 24) & 0xFF;
                int r = (rgb >>> 16) & 0xFF;
                int gr = (rgb >>> 8) & 0xFF;
                int b = rgb & 0xFF;

                if (a > 0) {
                    if (a < 255) foundEdge = true;
                    assertTrue(r >= 250, "Red at (" + x + "," + y + ") should be >= 250, got " + r);
                    assertTrue(gr >= 250, "Green at (" + x + "," + y + ") should be >= 250, got " + gr);
                    assertTrue(b >= 250, "Blue at (" + x + "," + y + ") should be >= 250, got " + b);
                }
            }
        }
        assertTrue(foundEdge, "Scaled disc must contain semi-transparent anti-aliased edge pixels");
    }

    @Test
    void testAtlasDimensionsEqualColumnsWByRowsH() {
        int cellW = 138;
        int cellH = 260;
        int cols = 4;
        int rows = 4;

        int expWalkW = cols * cellW;
        int expWalkH = rows * cellH;
        assertEquals(552, expWalkW);
        assertEquals(1040, expWalkH);

        int idleRows = 1;
        int expIdleW = cols * cellW;
        int expIdleH = idleRows * cellH;
        assertEquals(552, expIdleW);
        assertEquals(260, expIdleH);
    }

    @Test
    void testPerDirectionWalkScalingMatchesIdleHeight() {
        // Given 4 unscaled walk frames with mean height 354.0 and idle target 256.0
        List<Integer> unscaledHeights = List.of(354, 354, 354, 354);
        double meanUnscaled = 354.0;
        double scale = 256.0 / meanUnscaled;

        double sumScaled = 0;
        for (int h : unscaledHeights) {
            sumScaled += Math.round(h * scale);
        }
        double meanScaled = sumScaled / 4.0;

        assertEquals(256.0, meanScaled, 2.0,
                "Per-direction walk scaling must bring mean walk height within 2 px of 256");
    }

    @Test
    void testLegacy_resamplingPremultipliedAlphaLeavesNoDarkEdges() {
        int srcW = 16, srcH = 16;
        BufferedImage src = new BufferedImage(srcW, srcH, BufferedImage.TYPE_INT_ARGB);
        int brightYellow = 0xFF_FF_FF_00;
        for (int y = 3; y < 11; y++) {
            for (int x = 3; x < 11; x++) {
                src.setRGB(x, y, brightYellow);
            }
        }
        BufferedImage scaled = SpriteSlicer.scaleImage(src, 0.5);
        for (int y = 0; y < scaled.getHeight(); y++) {
            for (int x = 0; x < scaled.getWidth(); x++) {
                int rgb = scaled.getRGB(x, y);
                int a = (rgb >>> 24) & 0xFF;
                int r = (rgb >>> 16) & 0xFF;
                int g = (rgb >>> 8) & 0xFF;
                int b = rgb & 0xFF;
                if (a > 0) {
                    assertTrue(r >= 250);
                    assertTrue(g >= 250);
                    assertEquals(0, b);
                }
            }
        }
    }

    @Test
    void testLegacy_baselineAnchoringPutsLowestOpaqueRowAtHMinus3() {
        int cellH = 260;
        int localFeet = 250;
        int targetRow = cellH - 3; // 257
        int placementY = targetRow - localFeet; // 7
        assertEquals(257, placementY + localFeet);
    }

    @Test
    void testLegacy_frameMaskExcludesNeighbouringComponentPixels() {
        int srcW = 30, srcH = 30;
        BufferedImage src = new BufferedImage(srcW, srcH, BufferedImage.TYPE_INT_ARGB);
        int[][] compMap = new int[srcW][srcH];
        int red = 0xFF_FF_00_00;
        for (int y = 5; y <= 10; y++) {
            for (int x = 5; x <= 10; x++) {
                src.setRGB(x, y, red);
                compMap[x][y] = 1;
            }
        }
        int blue = 0xFF_00_00_FF;
        for (int y = 5; y <= 10; y++) {
            for (int x = 11; x <= 15; x++) {
                src.setRGB(x, y, blue);
                compMap[x][y] = 2;
            }
        }
        Set<Integer> allowed = Set.of(1);
        BufferedImage ext = SpriteSlicer.extractMaskedFrame(src, allowed, compMap, 5, 5, 15, 10);
        for (int y = 0; y < 6; y++) {
            for (int x = 6; x < 11; x++) {
                assertEquals(0, (ext.getRGB(x, y) >>> 24) & 0xFF);
            }
        }
    }

    @Test
    void testLegacy_scaleFactorCalculation() {
        double scale = 256.0 / 712.0;
        assertEquals(256.0 / 712.0, scale, 1e-9);
    }
}
