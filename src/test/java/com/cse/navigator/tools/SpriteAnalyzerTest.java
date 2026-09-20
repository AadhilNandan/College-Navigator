package com.cse.navigator.tools;

import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SpriteAnalyzerTest {

    @Test
    void detectsConnectedComponentsOnSyntheticImage() {
        // 10x10 image with 2 separate opaque rectangular regions
        BufferedImage img = new BufferedImage(10, 10, BufferedImage.TYPE_INT_ARGB);

        // Component 1: 3x3 box at (1,1) to (3,3) -> area 9
        int opaqueRed = 0xFF_FF_00_00;
        for (int y = 1; y <= 3; y++) {
            for (int x = 1; x <= 3; x++) {
                img.setRGB(x, y, opaqueRed);
            }
        }

        // Component 2: 2x3 box at (6,5) to (7,7) -> area 6
        int opaqueBlue = 0xFF_00_00_FF;
        for (int y = 5; y <= 7; y++) {
            for (int x = 6; x <= 7; x++) {
                img.setRGB(x, y, opaqueBlue);
            }
        }

        List<SpriteAnalyzer.Component> components = SpriteAnalyzer.findConnectedComponents(img, 16);
        assertEquals(2, components.size(), "Should detect exactly 2 connected components");

        // Sort by minX
        components.sort((a, b) -> Integer.compare(a.minX, b.minX));

        SpriteAnalyzer.Component c1 = components.get(0);
        assertEquals(1, c1.minX);
        assertEquals(1, c1.minY);
        assertEquals(3, c1.maxX);
        assertEquals(3, c1.maxY);
        assertEquals(3, c1.width());
        assertEquals(3, c1.height());
        assertEquals(9, c1.pixelCount);

        SpriteAnalyzer.Component c2 = components.get(1);
        assertEquals(6, c2.minX);
        assertEquals(5, c2.minY);
        assertEquals(7, c2.maxX);
        assertEquals(7, c2.maxY);
        assertEquals(2, c2.width());
        assertEquals(3, c2.height());
        assertEquals(6, c2.pixelCount);
    }

    @Test
    void verifies8ConnectivityDiagonals() {
        // 5x5 image with two pixels touching only diagonally
        BufferedImage img = new BufferedImage(5, 5, BufferedImage.TYPE_INT_ARGB);
        int opaque = 0xFF_00_FF_00;

        img.setRGB(1, 1, opaque);
        img.setRGB(2, 2, opaque);

        List<SpriteAnalyzer.Component> components = SpriteAnalyzer.findConnectedComponents(img, 16);
        assertEquals(1, components.size(), "8-connectivity must connect diagonally adjacent pixels into one component");

        SpriteAnalyzer.Component c = components.get(0);
        assertEquals(1, c.minX);
        assertEquals(1, c.minY);
        assertEquals(2, c.maxX);
        assertEquals(2, c.maxY);
        assertEquals(2, c.pixelCount);
    }

    @Test
    void respectsAlphaThreshold16() {
        BufferedImage img = new BufferedImage(5, 5, BufferedImage.TYPE_INT_ARGB);

        // Alpha = 16 (transparent per threshold > 16)
        int subThreshold = (16 << 24) | 0x00_FF_00_00;
        img.setRGB(1, 1, subThreshold);

        // Alpha = 17 (opaque per threshold > 16)
        int aboveThreshold = (17 << 24) | 0x00_00_FF_00;
        img.setRGB(3, 3, aboveThreshold);

        List<SpriteAnalyzer.Component> components = SpriteAnalyzer.findConnectedComponents(img, 16);
        assertEquals(1, components.size(), "Only pixels with alpha > 16 should form components");
        assertEquals(3, components.get(0).minX);
        assertEquals(3, components.get(0).minY);
        assertEquals(1, components.get(0).pixelCount);
    }

    @Test
    void measuresColorRunLengthsCorrectly() {
        BufferedImage img = new BufferedImage(8, 2, BufferedImage.TYPE_INT_ARGB);
        int red = 0xFF_FF_00_00;
        int blue = 0xFF_00_00_FF;

        // Row 0: 3 red, 2 blue, 1 transparent, 2 red
        img.setRGB(0, 0, red);
        img.setRGB(1, 0, red);
        img.setRGB(2, 0, red);
        img.setRGB(3, 0, blue);
        img.setRGB(4, 0, blue);
        // (5,0 is transparent)
        img.setRGB(6, 0, red);
        img.setRGB(7, 0, red);

        SpriteAnalyzer.RunAnalysisResult result = SpriteAnalyzer.measureColorRunLengths(img, 16);
        assertEquals(2, result.frequencies.get(2), "Should have 2 runs of length 2");
        assertEquals(1, result.frequencies.get(3), "Should have 1 run of length 3");
    }
}
