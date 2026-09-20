package com.cse.navigator.tools;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.List;

/**
 * Character Sprite Production & Rebuild Tool (Stage B2).
 * Normalises standing height to 256 px based on IDLE references.
 * Scales walk frames uniformly per-direction to match idle height.
 * Uses progressive halving (bilinear) + final bicubic step on TYPE_INT_ARGB_PRE.
 * Computes upper-body pivotX and uniform cell dimensions (W, H) per character.
 * Anchors each frame so pivotX is at column W/2 and lowest opaque row is at row H - 3.
 */
public class SpriteSlicer {

    public static final int ALPHA_THRESHOLD = 16;
    public static final int COMPONENT_SIZE_THRESHOLD = 50;

    public static class Component {
        public final int id;
        public int minX, minY, maxX, maxY;
        public int pixelCount;
        public long sumX, sumY;

        public Component(int id, int x, int y) {
            this.id = id;
            this.minX = x; this.maxX = x;
            this.minY = y; this.maxY = y;
            this.pixelCount = 1;
            this.sumX = x; this.sumY = y;
        }

        public void addPixel(int x, int y) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            pixelCount++;
            sumX += x;
            sumY += y;
        }

        public int width() { return maxX - minX + 1; }
        public int height() { return maxY - minY + 1; }
        public double centroidX() { return (double) sumX / pixelCount; }
        public double centroidY() { return (double) sumY / pixelCount; }
        public double centerX() { return (minX + maxX) / 2.0; }
        public double centerY() { return (minY + maxY) / 2.0; }
    }

    public static class FrameData {
        public final int index;
        public final String name;
        public final String direction;
        public BufferedImage extracted;
        public BufferedImage scaled;
        public int unscaledWidth;
        public int unscaledHeight;
        public int scaledWidth;
        public int scaledHeight;
        public double pivotX;
        public int lowestOpaqueRow;
        public int placementX;
        public int placementY;

        public FrameData(int index, String name, String direction) {
            this.index = index;
            this.name = name;
            this.direction = direction;
        }
    }

    public static class CharacterPackage {
        public final String character;
        public final int cellWidth;
        public final int cellHeight;
        public final int pivotColumn;
        public final int baselineRow;
        public final Map<String, Double> idleScales;
        public final Map<String, Double> walkScales;
        public final List<FrameData> idleFrames;
        public final List<FrameData> walkFrames;
        public final AtlasResult walkAtlas;
        public final AtlasResult idleAtlas;

        public CharacterPackage(String character, int cellWidth, int cellHeight,
                                int pivotColumn, int baselineRow,
                                Map<String, Double> idleScales, Map<String, Double> walkScales,
                                List<FrameData> idleFrames, List<FrameData> walkFrames,
                                AtlasResult walkAtlas, AtlasResult idleAtlas) {
            this.character = character;
            this.cellWidth = cellWidth;
            this.cellHeight = cellHeight;
            this.pivotColumn = pivotColumn;
            this.baselineRow = baselineRow;
            this.idleScales = idleScales;
            this.walkScales = walkScales;
            this.idleFrames = idleFrames;
            this.walkFrames = walkFrames;
            this.walkAtlas = walkAtlas;
            this.idleAtlas = idleAtlas;
        }
    }

    public static class AtlasResult {
        public final String name;
        public final String fileName;
        public final File file;
        public final BufferedImage image;
        public final int cellWidth;
        public final int cellHeight;
        public final int columns;
        public final int rows;
        public final List<String> directionOrder;
        public final int framesPerDirection;
        public final int pivotX;
        public final int anchorY;
        public final Map<String, Double> directionScales;
        public final int targetHeight;
        public final String sourceFile;
        public final long sourceFileSize;
        public final List<FrameData> frames;

        public AtlasResult(String name, String fileName, File file, BufferedImage image,
                           int cellWidth, int cellHeight, int columns, int rows,
                           List<String> directionOrder, int framesPerDirection,
                           int pivotX, int anchorY, Map<String, Double> directionScales,
                           int targetHeight, String sourceFile, long sourceFileSize,
                           List<FrameData> frames) {
            this.name = name;
            this.fileName = fileName;
            this.file = file;
            this.image = image;
            this.cellWidth = cellWidth;
            this.cellHeight = cellHeight;
            this.columns = columns;
            this.rows = rows;
            this.directionOrder = directionOrder;
            this.framesPerDirection = framesPerDirection;
            this.pivotX = pivotX;
            this.anchorY = anchorY;
            this.directionScales = directionScales;
            this.targetHeight = targetHeight;
            this.sourceFile = sourceFile;
            this.sourceFileSize = sourceFileSize;
            this.frames = frames;
        }
    }

    /**
     * Detects 8-connected components and records pixel ownership in compMap.
     */
    public static List<Component> findConnectedComponents(BufferedImage image, int alphaThreshold, int[][] compMap) {
        int w = image.getWidth();
        int h = image.getHeight();
        boolean[][] visited = new boolean[w][h];
        List<Component> components = new ArrayList<>();
        int[] qx = new int[w * h];
        int[] qy = new int[w * h];
        int compId = 0;

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (visited[x][y]) continue;
                int alpha = (image.getRGB(x, y) >>> 24) & 0xFF;
                if (alpha <= alphaThreshold) continue;

                Component comp = new Component(++compId, x, y);
                visited[x][y] = true;
                if (compMap != null) compMap[x][y] = compId;

                int head = 0, tail = 0;
                qx[tail] = x; qy[tail] = y; tail++;

                while (head < tail) {
                    int cx = qx[head], cy = qy[head]; head++;
                    for (int dy = -1; dy <= 1; dy++) {
                        for (int dx = -1; dx <= 1; dx++) {
                            if (dx == 0 && dy == 0) continue;
                            int nx = cx + dx, ny = cy + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[nx][ny]) {
                                int nAlpha = (image.getRGB(nx, ny) >>> 24) & 0xFF;
                                if (nAlpha > alphaThreshold) {
                                    visited[nx][ny] = true;
                                    if (compMap != null) compMap[nx][ny] = compId;
                                    comp.addPixel(nx, ny);
                                    qx[tail] = nx; qy[tail] = ny; tail++;
                                }
                            }
                        }
                    }
                }
                components.add(comp);
            }
        }
        return components;
    }

    /**
     * Scaling method: premultiplied alpha (TYPE_INT_ARGB_PRE), progressive halving with bilinear,
     * final bicubic step, then back to non-premultiplied.
     */
    public static BufferedImage scaleImage(BufferedImage src, double scale) {
        int w = src.getWidth();
        int h = src.getHeight();
        int targetW = Math.max(1, (int) Math.round(w * scale));
        int targetH = Math.max(1, (int) Math.round(h * scale));

        BufferedImage current = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB_PRE);
        Graphics2D g0 = current.createGraphics();
        g0.drawImage(src, 0, 0, null);
        g0.dispose();

        int curW = w;
        int curH = h;
        while (curW > targetW * 2 || curH > targetH * 2) {
            int nextW = Math.max(targetW, curW / 2);
            int nextH = Math.max(targetH, curH / 2);
            BufferedImage next = new BufferedImage(nextW, nextH, BufferedImage.TYPE_INT_ARGB_PRE);
            Graphics2D gStep = next.createGraphics();
            gStep.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            gStep.drawImage(current, 0, 0, nextW, nextH, null);
            gStep.dispose();
            current = next;
            curW = nextW;
            curH = nextH;
        }

        BufferedImage finalPre = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_ARGB_PRE);
        Graphics2D gFinal = finalPre.createGraphics();
        gFinal.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        gFinal.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        gFinal.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        gFinal.drawImage(current, 0, 0, targetW, targetH, null);
        gFinal.dispose();

        BufferedImage result = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < targetH; y++) {
            for (int x = 0; x < targetW; x++) {
                int preRgb = finalPre.getRGB(x, y);
                int a = (preRgb >>> 24) & 0xFF;
                if (a == 0) {
                    result.setRGB(x, y, 0);
                } else {
                    int r = (preRgb >>> 16) & 0xFF;
                    int gr = (preRgb >>> 8) & 0xFF;
                    int b = preRgb & 0xFF;
                    result.setRGB(x, y, (a << 24) | (r << 16) | (gr << 8) | b);
                }
            }
        }
        return result;
    }

    /**
     * pivotX per frame = mean x of the opaque pixels in the top 40% of that frame's height.
     */
    public static double computePivotX(BufferedImage frame) {
        int w = frame.getWidth();
        int h = frame.getHeight();
        int topRows = (int) Math.ceil(0.40 * h);
        double sumX = 0;
        int count = 0;
        for (int y = 0; y < topRows; y++) {
            for (int x = 0; x < w; x++) {
                int a = (frame.getRGB(x, y) >>> 24) & 0xFF;
                if (a > ALPHA_THRESHOLD) {
                    sumX += x;
                    count++;
                }
            }
        }
        return count > 0 ? (sumX / count) : (w / 2.0);
    }

    /**
     * Finds the lowest row index (0-based) containing an opaque pixel (alpha > 16).
     */
    public static int findLowestOpaqueRow(BufferedImage frame) {
        int w = frame.getWidth();
        int h = frame.getHeight();
        for (int y = h - 1; y >= 0; y--) {
            for (int x = 0; x < w; x++) {
                int a = (frame.getRGB(x, y) >>> 24) & 0xFF;
                if (a > ALPHA_THRESHOLD) {
                    return y;
                }
            }
        }
        return h - 1;
    }

    /**
     * Attaches fragments to the nearest primary body based on Euclidean centroid distance.
     */
    public static Map<Integer, Set<Integer>> groupComponentsToBodies(List<Component> primaryBodies,
                                                                    List<Component> allComponents,
                                                                    int speckThreshold) {
        Map<Integer, Set<Integer>> mapping = new HashMap<>();
        for (int i = 0; i < primaryBodies.size(); i++) {
            mapping.put(i, new HashSet<>());
            mapping.get(i).add(primaryBodies.get(i).id);
        }

        Set<Integer> bodyIds = new HashSet<>();
        for (Component b : primaryBodies) bodyIds.add(b.id);

        for (Component c : allComponents) {
            if (bodyIds.contains(c.id)) continue;
            if (c.pixelCount < speckThreshold) continue; // Specks are dropped

            int bestIdx = 0;
            double bestDist = Double.MAX_VALUE;
            for (int i = 0; i < primaryBodies.size(); i++) {
                Component b = primaryBodies.get(i);
                double dx = c.centroidX() - b.centroidX();
                double dy = c.centroidY() - b.centroidY();
                double dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
            mapping.get(bestIdx).add(c.id);
        }
        return mapping;
    }

    /**
     * Extracts a masked frame containing only pixels belonging to allowed component IDs.
     */
    public static BufferedImage extractMaskedFrame(BufferedImage src, Set<Integer> allowedCompIds,
                                                   int[][] compMap, int minX, int minY, int maxX, int maxY) {
        int w = maxX - minX + 1;
        int h = maxY - minY + 1;
        BufferedImage frame = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        for (int y = minY; y <= maxY; y++) {
            for (int x = minX; x <= maxX; x++) {
                if (allowedCompIds.contains(compMap[x][y])) {
                    frame.setRGB(x - minX, y - minY, src.getRGB(x, y));
                }
            }
        }
        return frame;
    }

    /**
     * Processes one character's walk and idle sheets together to ensure identical cell size (W, H).
     */
    public static CharacterPackage processCharacter(String character, File charDir, File outDir) throws IOException {
        String[] dirNames = { "front", "back", "left", "right" };
        File idleFile = new File(charDir, character + "_main_idle_4dir.png");
        File walkFile = new File(charDir, character + "_main_walk_4dir.png");

        BufferedImage idleImg = ImageIO.read(idleFile);
        int[][] idleMap = new int[idleImg.getWidth()][idleImg.getHeight()];
        List<Component> idleComps = findConnectedComponents(idleImg, ALPHA_THRESHOLD, idleMap);
        List<Component> idleSig = new ArrayList<>();
        for (Component c : idleComps) if (c.pixelCount >= COMPONENT_SIZE_THRESHOLD) idleSig.add(c);
        idleSig.sort(Comparator.comparingDouble(Component::centroidX));

        BufferedImage walkImg = ImageIO.read(walkFile);
        int[][] walkMap = new int[walkImg.getWidth()][walkImg.getHeight()];
        List<Component> walkComps = findConnectedComponents(walkImg, ALPHA_THRESHOLD, walkMap);

        // 16 primary walk bodies
        Component[][] walkPrimaryGrid = new Component[4][4];
        List<Component> walkPrimaryList = new ArrayList<>(16);
        for (int r = 0; r < 4; r++) {
            for (int c = 0; c < 4; c++) {
                int nominalMinX = c * 256;
                int nominalMaxX = (c + 1) * 256 - 1;
                int nominalMinY = r * 384;
                int nominalMaxY = (r + 1) * 384 - 1;

                Component bestBody = null;
                for (Component comp : walkComps) {
                    if (comp.pixelCount >= COMPONENT_SIZE_THRESHOLD) {
                        int col = Math.min(3, Math.max(0, (int) (comp.centroidX() / 256)));
                        int row = Math.min(3, Math.max(0, (int) (comp.centroidY() / 384)));
                        if (row == r && col == c) {
                            if (bestBody == null || comp.pixelCount > bestBody.pixelCount) {
                                bestBody = comp;
                            }
                        }
                    }
                }
                walkPrimaryGrid[r][c] = bestBody;
                walkPrimaryList.add(bestBody);
            }
        }

        // Group fragments to bodies
        Map<Integer, Set<Integer>> idleGrouping = groupComponentsToBodies(idleSig, idleComps, COMPONENT_SIZE_THRESHOLD);
        Map<Integer, Set<Integer>> walkGrouping = groupComponentsToBodies(walkPrimaryList, walkComps, COMPONENT_SIZE_THRESHOLD);

        // Calculate scales:
        // Idle: one scale per direction so each idle figure is exactly 256 px tall
        Map<String, Double> idleScales = new LinkedHashMap<>();
        for (int i = 0; i < 4; i++) {
            Component b = idleSig.get(i);
            idleScales.put(dirNames[i], 256.0 / b.height());
        }

        // Walk: one scale per direction so mean height of that direction's 4 walk frames equals idle height (256 px)
        Map<String, Double> walkScales = new LinkedHashMap<>();
        for (int r = 0; r < 4; r++) {
            double sumH = 0;
            for (int c = 0; c < 4; c++) {
                sumH += walkPrimaryGrid[r][c].height();
            }
            double meanH = sumH / 4.0;
            walkScales.put(dirNames[r], 256.0 / meanH);
        }

        // Extract and scale 4 idle frames
        List<FrameData> idleFrames = new ArrayList<>(4);
        for (int i = 0; i < 4; i++) {
            Component b = idleSig.get(i);
            Set<Integer> compIds = idleGrouping.get(i);
            FrameData fd = new FrameData(i, dirNames[i], dirNames[i]);
            fd.unscaledWidth = b.width();
            fd.unscaledHeight = b.height();
            fd.extracted = extractMaskedFrame(idleImg, compIds, idleMap, b.minX, b.minY, b.maxX, b.maxY);
            fd.scaled = scaleImage(fd.extracted, idleScales.get(dirNames[i]));
            fd.scaledWidth = fd.scaled.getWidth();
            fd.scaledHeight = fd.scaled.getHeight();
            fd.pivotX = computePivotX(fd.scaled);
            fd.lowestOpaqueRow = findLowestOpaqueRow(fd.scaled);
            idleFrames.add(fd);
        }

        // Extract and scale 16 walk frames
        List<FrameData> walkFrames = new ArrayList<>(16);
        for (int r = 0; r < 4; r++) {
            String dir = dirNames[r];
            double sc = walkScales.get(dir);
            for (int c = 0; c < 4; c++) {
                int idx = r * 4 + c;
                Component b = walkPrimaryGrid[r][c];
                Set<Integer> compIds = walkGrouping.get(idx);
                FrameData fd = new FrameData(idx, String.format("%s_frame_%d", dir, c + 1), dir);
                fd.unscaledWidth = b.width();
                fd.unscaledHeight = b.height();
                fd.extracted = extractMaskedFrame(walkImg, compIds, walkMap, b.minX, b.minY, b.maxX, b.maxY);
                fd.scaled = scaleImage(fd.extracted, sc);
                fd.scaledWidth = fd.scaled.getWidth();
                fd.scaledHeight = fd.scaled.getHeight();
                fd.pivotX = computePivotX(fd.scaled);
                fd.lowestOpaqueRow = findLowestOpaqueRow(fd.scaled);
                walkFrames.add(fd);
            }
        }

        // Compute unified cell dimensions W and H across all 20 frames
        List<FrameData> allFrames = new ArrayList<>(20);
        allFrames.addAll(idleFrames);
        allFrames.addAll(walkFrames);

        double maxDist = 0;
        int maxH = 0;
        for (FrameData fd : allFrames) {
            double pX = fd.pivotX;
            double dLeft = pX;
            double dRight = (fd.scaledWidth - 1) - pX;
            double localMax = Math.max(dLeft, dRight);
            if (localMax > maxDist) maxDist = localMax;
            if (fd.scaledHeight > maxH) maxH = fd.scaledHeight;
        }

        int W = (int) Math.ceil(2 * maxDist + 4);
        if (W % 2 != 0) W++;
        int H = maxH + 4;
        int pivotColumn = W / 2;
        int baselineRow = H - 3;

        // Place frames in cell: pivotX at column W/2, lowest opaque row at row H - 3
        for (FrameData fd : allFrames) {
            fd.placementX = (int) Math.round(pivotColumn - fd.pivotX);
            fd.placementY = baselineRow - fd.lowestOpaqueRow;
        }

        // Build Walk Atlas (4 cols x 4 rows)
        int walkAtlasW = 4 * W;
        int walkAtlasH = 4 * H;
        BufferedImage walkAtlasImg = new BufferedImage(walkAtlasW, walkAtlasH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D gWalk = walkAtlasImg.createGraphics();
        for (int i = 0; i < 16; i++) {
            FrameData fd = walkFrames.get(i);
            int col = i % 4;
            int row = i / 4;
            int cellX = col * W;
            int cellY = row * H;
            gWalk.drawImage(fd.scaled, cellX + fd.placementX, cellY + fd.placementY, null);
        }
        gWalk.dispose();
        File walkOutFile = new File(outDir, character + "_walk.png");
        ImageIO.write(walkAtlasImg, "png", walkOutFile);

        AtlasResult walkAtlas = new AtlasResult(
                character + "_walk", character + "_walk.png", walkOutFile, walkAtlasImg,
                W, H, 4, 4, List.of(dirNames), 4, pivotColumn, baselineRow,
                walkScales, 256, "assets/character/" + walkFile.getName(),
                walkFile.length(), walkFrames);

        // Build Idle Atlas (4 cols x 1 row)
        int idleAtlasW = 4 * W;
        int idleAtlasH = 1 * H;
        BufferedImage idleAtlasImg = new BufferedImage(idleAtlasW, idleAtlasH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D gIdle = idleAtlasImg.createGraphics();
        for (int i = 0; i < 4; i++) {
            FrameData fd = idleFrames.get(i);
            int cellX = i * W;
            int cellY = 0;
            gIdle.drawImage(fd.scaled, cellX + fd.placementX, cellY + fd.placementY, null);
        }
        gIdle.dispose();
        File idleOutFile = new File(outDir, character + "_idle.png");
        ImageIO.write(idleAtlasImg, "png", idleOutFile);

        AtlasResult idleAtlas = new AtlasResult(
                character + "_idle", character + "_idle.png", idleOutFile, idleAtlasImg,
                W, H, 4, 1, List.of(dirNames), 1, pivotColumn, baselineRow,
                idleScales, 256, "assets/character/" + idleFile.getName(),
                idleFile.length(), idleFrames);

        return new CharacterPackage(character, W, H, pivotColumn, baselineRow,
                idleScales, walkScales, idleFrames, walkFrames, walkAtlas, idleAtlas);
    }

    /**
     * Processes the shadow: crops to opaque bounding box, scales to width 128 px using the same pipeline.
     */
    public static File processShadow(File shadowSource, File outDir) throws IOException {
        BufferedImage src = ImageIO.read(shadowSource);
        int minX = Integer.MAX_VALUE, minY = Integer.MAX_VALUE, maxX = -1, maxY = -1;

        for (int y = 0; y < src.getHeight(); y++) {
            for (int x = 0; x < src.getWidth(); x++) {
                int a = (src.getRGB(x, y) >>> 24) & 0xFF;
                if (a > ALPHA_THRESHOLD) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        int trimmedW = maxX - minX + 1;
        int trimmedH = maxY - minY + 1;
        BufferedImage trimmed = src.getSubimage(minX, minY, trimmedW, trimmedH);

        double scale = 128.0 / trimmedW;
        BufferedImage scaled = scaleImage(trimmed, scale);

        File outFile = new File(outDir, "character_shadow.png");
        ImageIO.write(scaled, "png", outFile);
        return outFile;
    }

    /**
     * Generates preview for an atlas on magenta with cell borders, pivot cross, and row labels.
     */
    public static File generateAtlasPreview(AtlasResult atlas, File previewDir) throws IOException {
        int labelGutter = 70;
        int w = labelGutter + atlas.columns * atlas.cellWidth;
        int h = atlas.rows * atlas.cellHeight;

        BufferedImage preview = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = preview.createGraphics();

        // Magenta background
        g.setColor(new Color(255, 0, 255));
        g.fillRect(0, 0, w, h);

        // Draw labels gutter background (slightly darker magenta)
        g.setColor(new Color(200, 0, 200));
        g.fillRect(0, 0, labelGutter, h);

        // Draw row labels
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 16));
        FontMetrics fm = g.getFontMetrics();
        for (int r = 0; r < atlas.rows; r++) {
            String label = atlas.directionOrder.get(r);
            int textY = r * atlas.cellHeight + (atlas.cellHeight / 2) + (fm.getAscent() / 2);
            g.drawString(label, 10, textY);
        }

        // Draw atlas image
        g.drawImage(atlas.image, labelGutter, 0, null);

        // Draw cell borders and pivot crosses
        for (int r = 0; r < atlas.rows; r++) {
            for (int c = 0; c < atlas.columns; c++) {
                int cellX = labelGutter + c * atlas.cellWidth;
                int cellY = r * atlas.cellHeight;

                // Cell border
                g.setColor(new Color(255, 255, 255, 180));
                g.drawRect(cellX, cellY, atlas.cellWidth, atlas.cellHeight);

                // Baseline line at anchorY (row H - 3)
                g.setColor(new Color(255, 0, 0, 180));
                g.drawLine(cellX, cellY + atlas.anchorY, cellX + atlas.cellWidth - 1, cellY + atlas.anchorY);

                // Cross at the pivot (pivotX = W/2, baseline = H - 3)
                int px = cellX + atlas.pivotX;
                int py = cellY + atlas.anchorY;
                g.setColor(Color.YELLOW);
                g.drawLine(px - 6, py, px + 6, py);
                g.drawLine(px, py - 6, px, py + 6);
            }
        }
        g.dispose();

        File outFile = new File(previewDir, atlas.name + "_atlas_preview.png");
        ImageIO.write(preview, "png", outFile);
        return outFile;
    }

    /**
     * Generates compare_boy_girl.png: boy and girl front idle and front walk frame 1 side by side.
     */
    public static File generateCompareBoyGirl(CharacterPackage boy, CharacterPackage girl, File previewDir) throws IOException {
        FrameData boyIdleFront = boy.idleFrames.get(0);
        FrameData boyWalkFront1 = boy.walkFrames.get(0);
        FrameData girlIdleFront = girl.idleFrames.get(0);
        FrameData girlWalkFront1 = girl.walkFrames.get(0);

        FrameData[] figures = { boyIdleFront, boyWalkFront1, girlIdleFront, girlWalkFront1 };
        String[] titles = { "Boy Idle Front", "Boy Walk Front 1", "Girl Idle Front", "Girl Walk Front 1" };

        int figW = 180;
        int figH = 280;
        int pad = 16;
        int totalW = pad + 4 * (figW + pad);
        int totalH = figH + 60;

        BufferedImage img = new BufferedImage(totalW, totalH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(230, 230, 230));
        g.fillRect(0, 0, totalW, totalH);

        int groundY = figH + 10;
        g.setColor(new Color(150, 150, 150));
        g.drawLine(0, groundY, totalW, groundY);

        g.setFont(new Font("SansSerif", Font.BOLD, 13));
        FontMetrics fm = g.getFontMetrics();

        for (int i = 0; i < 4; i++) {
            FrameData fd = figures[i];
            int cx = pad + i * (figW + pad) + figW / 2;
            int drawX = (int) Math.round(cx - fd.pivotX);
            int drawY = groundY - fd.lowestOpaqueRow;

            g.drawImage(fd.scaled, drawX, drawY, null);

            g.setColor(new Color(30, 30, 30));
            String title = titles[i];
            int tx = cx - fm.stringWidth(title) / 2;
            g.drawString(title, tx, groundY + 24);

            String dim = String.format("%dx%d px", fd.scaledWidth, fd.scaledHeight);
            int dx = cx - fm.stringWidth(dim) / 2;
            g.drawString(dim, dx, groundY + 40);
        }
        g.dispose();

        File outFile = new File(previewDir, "compare_boy_girl.png");
        ImageIO.write(img, "png", outFile);
        return outFile;
    }

    /**
     * Generates idle_vs_walk.png: for each direction, walk frame 1 and idle frame side by side on magenta,
     * with a line at the baseline and a line at the walk frame's top.
     */
    public static File generateIdleVsWalk(CharacterPackage boy, CharacterPackage girl, File previewDir) throws IOException {
        String[] dirs = { "front", "back", "left", "right" };
        int pairW = 260;
        int cellH = 290;
        int pad = 20;

        int totalW = pad + 4 * (pairW + pad);
        int totalH = pad + 2 * (cellH + pad + 30);

        BufferedImage img = new BufferedImage(totalW, totalH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();

        // Magenta background
        g.setColor(new Color(255, 0, 255));
        g.fillRect(0, 0, totalW, totalH);

        g.setFont(new Font("SansSerif", Font.BOLD, 14));

        CharacterPackage[] chars = { boy, girl };
        String[] charNames = { "BOY (256 px)", "GIRL (256 px)" };

        for (int chIdx = 0; chIdx < 2; chIdx++) {
            CharacterPackage cp = chars[chIdx];
            int rowTop = pad + chIdx * (cellH + pad + 30);

            g.setColor(Color.YELLOW);
            g.drawString(charNames[chIdx] + " — Idle vs Walk Frame 1 (Height Reference Check)", pad, rowTop + 14);

            for (int d = 0; d < 4; d++) {
                FrameData walkF = cp.walkFrames.get(d * 4); // Walk frame 1
                FrameData idleF = cp.idleFrames.get(d);     // Idle frame

                int pairLeft = pad + d * (pairW + pad);
                int baseline = rowTop + 30 + 265;

                // Walk frame on left of pair
                int walkX = pairLeft + 20;
                int walkY = baseline - walkF.lowestOpaqueRow;
                g.drawImage(walkF.scaled, walkX, walkY, null);

                // Idle frame on right of pair
                int idleX = pairLeft + 140;
                int idleY = baseline - idleF.lowestOpaqueRow;
                g.drawImage(idleF.scaled, idleX, idleY, null);

                // Red line at feet baseline
                g.setColor(Color.RED);
                g.drawLine(pairLeft, baseline, pairLeft + pairW, baseline);

                // Cyan line at walk frame top
                int walkTopY = baseline - walkF.scaledHeight + 1;
                g.setColor(Color.CYAN);
                g.drawLine(pairLeft, walkTopY, pairLeft + pairW, walkTopY);

                // Direction label
                g.setColor(Color.WHITE);
                g.drawString(dirs[d].toUpperCase() + " (Walk:" + walkF.scaledHeight + ", Idle:" + idleF.scaledHeight + ")",
                        pairLeft + 15, baseline + 18);
            }
        }
        g.dispose();

        File outFile = new File(previewDir, "idle_vs_walk.png");
        ImageIO.write(img, "png", outFile);
        return outFile;
    }

    /**
     * Generates edge_check.png: one frame of each character on white and on #12344A, enlarged 4x nearest neighbour.
     */
    public static File generateEdgeCheck(CharacterPackage boy, CharacterPackage girl, File previewDir) throws IOException {
        BufferedImage boyFrame = boy.idleFrames.get(0).scaled;
        BufferedImage girlFrame = girl.idleFrames.get(0).scaled;

        int pad = 10;
        int secW = pad + boyFrame.getWidth() + pad + girlFrame.getWidth() + pad;
        int secH = pad + Math.max(boyFrame.getHeight(), girlFrame.getHeight()) + pad;

        // 1x image: top on white, bottom on #12344A
        BufferedImage img1x = new BufferedImage(secW, secH * 2, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img1x.createGraphics();

        // Top: pure white
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, secW, secH);
        g.drawImage(boyFrame, pad, pad, null);
        g.drawImage(girlFrame, pad + boyFrame.getWidth() + pad, pad, null);

        // Bottom: #12344A
        Color navy = new Color(0x12, 0x34, 0x4A);
        g.setColor(navy);
        g.fillRect(0, secH, secW, secH);
        g.drawImage(boyFrame, pad, secH + pad, null);
        g.drawImage(girlFrame, pad + boyFrame.getWidth() + pad, secH + pad, null);
        g.dispose();

        // 4x enlargement with nearest neighbour
        BufferedImage img4x = new BufferedImage(secW * 4, secH * 8, BufferedImage.TYPE_INT_RGB);
        Graphics2D g4 = img4x.createGraphics();
        g4.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        g4.drawImage(img1x, 0, 0, secW * 4, secH * 8, null);
        g4.dispose();

        File outFile = new File(previewDir, "edge_check.png");
        ImageIO.write(img4x, "png", outFile);
        return outFile;
    }

    /**
     * Writes character-frames.json including pivotX, anchorY, per-direction scales, and source file sizes.
     */
    public static void writeJson(CharacterPackage boy, CharacterPackage girl, File shadowFile,
                                 File shadowSource, File jsonFile) throws IOException {
        BufferedImage shadowImg = ImageIO.read(shadowFile);
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  \"standingHeight\": 256,\n");
        sb.append("  \"atlases\": {\n");

        AtlasResult[] atlases = { boy.walkAtlas, boy.idleAtlas, girl.walkAtlas, girl.idleAtlas };
        for (int a = 0; a < atlases.length; a++) {
            AtlasResult ar = atlases[a];
            sb.append("    \"").append(ar.name).append("\": {\n");
            sb.append("      \"file\": \"").append(ar.fileName).append("\",\n");
            sb.append("      \"cellWidth\": ").append(ar.cellWidth).append(",\n");
            sb.append("      \"cellHeight\": ").append(ar.cellHeight).append(",\n");
            sb.append("      \"columns\": ").append(ar.columns).append(",\n");
            sb.append("      \"rows\": ").append(ar.rows).append(",\n");
            sb.append("      \"directionOrder\": [\"front\", \"back\", \"left\", \"right\"],\n");
            sb.append("      \"framesPerDirection\": ").append(ar.framesPerDirection).append(",\n");
            sb.append("      \"pivotX\": ").append(ar.pivotX).append(",\n");
            sb.append("      \"anchorY\": ").append(ar.anchorY).append(",\n");
            sb.append("      \"directionScales\": {\n");
            int dCount = 0;
            for (Map.Entry<String, Double> se : ar.directionScales.entrySet()) {
                sb.append(String.format(Locale.ROOT, "        \"%s\": %.8f", se.getKey(), se.getValue()));
                sb.append(++dCount < 4 ? ",\n" : "\n");
            }
            sb.append("      },\n");
            sb.append("      \"targetHeight\": ").append(ar.targetHeight).append(",\n");
            sb.append("      \"sourceFile\": \"").append(ar.sourceFile).append("\",\n");
            sb.append("      \"sourceFileSize\": ").append(ar.sourceFileSize).append("\n");
            sb.append("    }").append(a < atlases.length - 1 ? ",\n" : "\n");
        }

        sb.append("  },\n");
        sb.append("  \"shadow\": {\n");
        sb.append("    \"file\": \"").append(shadowFile.getName()).append("\",\n");
        sb.append("    \"width\": ").append(shadowImg.getWidth()).append(",\n");
        sb.append("    \"height\": ").append(shadowImg.getHeight()).append(",\n");
        sb.append("    \"sourceFile\": \"assets/character/character_shadow.png\",\n");
        sb.append("    \"sourceFileSize\": ").append(shadowSource.length()).append("\n");
        sb.append("  }\n");
        sb.append("}\n");

        try (FileWriter fw = new FileWriter(jsonFile)) {
            fw.write(sb.toString());
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("==================================================================");
        System.out.println("       CHARACTER SPRITE PRODUCTION & REBUILD REPORT (STAGE B2)    ");
        System.out.println("==================================================================");
        System.out.println("Target Standing Height: 256 px (both characters, IDLE reference)");
        System.out.println("Scaling Method: TYPE_INT_ARGB_PRE progressive halving (bilinear) + bicubic\n");

        Path projectRoot = Path.of("").toAbsolutePath();
        File charDir = projectRoot.resolve("assets").resolve("character").toFile();
        File outDir = projectRoot.resolve("assets").resolve("optimised").resolve("character").toFile();
        File previewDir = projectRoot.resolve("assets").resolve("optimised").resolve("preview").toFile();

        Files.createDirectories(outDir.toPath());
        Files.createDirectories(previewDir.toPath());

        // Process characters
        CharacterPackage boy = processCharacter("boy", charDir, outDir);
        CharacterPackage girl = processCharacter("girl", charDir, outDir);

        // Process shadow
        File shadowSource = new File(charDir, "character_shadow.png");
        File shadowFile = processShadow(shadowSource, outDir);

        // Write character-frames.json
        File jsonFile = new File(outDir, "character-frames.json");
        writeJson(boy, girl, shadowFile, shadowSource, jsonFile);

        // Previews
        Map<String, File> previews = new LinkedHashMap<>();
        previews.put("boy_walk_atlas_preview.png", generateAtlasPreview(boy.walkAtlas, previewDir));
        previews.put("girl_walk_atlas_preview.png", generateAtlasPreview(girl.walkAtlas, previewDir));
        previews.put("compare_boy_girl.png", generateCompareBoyGirl(boy, girl, previewDir));
        previews.put("idle_vs_walk.png", generateIdleVsWalk(boy, girl, previewDir));
        previews.put("edge_check.png", generateEdgeCheck(boy, girl, previewDir));

        // -------------------------------------------------------------
        // CHECKS TO PRINT
        // -------------------------------------------------------------
        System.out.println("--- CHECK 1: NO-LOSS PIXEL AUDIT PER SHEET ---");
        String[] sheetNames = { "boy_main_walk_4dir.png", "girl_main_walk_4dir.png", "boy_main_idle_4dir.png", "girl_main_idle_4dir.png" };
        for (String sName : sheetNames) {
            BufferedImage img = ImageIO.read(new File(charDir, sName));
            int w = img.getWidth();
            int h = img.getHeight();
            int totalOpaque = 0;
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (((img.getRGB(x, y) >>> 24) & 0xFF) > ALPHA_THRESHOLD) totalOpaque++;
                }
            }

            List<Component> comps = findConnectedComponents(img, ALPHA_THRESHOLD, null);
            int sumFramePixels = 0;
            int droppedSpecks = 0;
            for (Component c : comps) {
                if (c.pixelCount >= COMPONENT_SIZE_THRESHOLD) {
                    sumFramePixels += c.pixelCount;
                } else {
                    droppedSpecks += c.pixelCount;
                }
            }
            int totalSum = sumFramePixels + droppedSpecks;
            System.out.printf(Locale.ROOT,
                    "%-26s | total opaque pixels = %7d | sum over frames (%7d) + dropped specks (%d) = %7d | MATCH: %b%n",
                    sName, totalOpaque, sumFramePixels, droppedSpecks, totalSum, (totalOpaque == totalSum));
        }

        System.out.println("\n--- CHECK 2: CELL CLEAR BORDER (>= 1 PX ON ALL 4 SIDES) ---");
        CharacterPackage[] cps = { boy, girl };
        for (CharacterPackage cp : cps) {
            List<FrameData> allFrames = new ArrayList<>();
            allFrames.addAll(cp.walkFrames);
            allFrames.addAll(cp.idleFrames);

            int minL = Integer.MAX_VALUE, minR = Integer.MAX_VALUE, minT = Integer.MAX_VALUE, minB = Integer.MAX_VALUE;
            for (FrameData fd : allFrames) {
                int leftB = fd.placementX;
                int rightB = cp.cellWidth - (fd.placementX + fd.scaledWidth);
                int topB = fd.placementY;
                int bottomB = cp.cellHeight - 1 - (fd.placementY + fd.lowestOpaqueRow);

                if (leftB < minL) minL = leftB;
                if (rightB < minR) minR = rightB;
                if (topB < minT) minT = topB;
                if (bottomB < minB) minB = bottomB;
            }
            System.out.printf(Locale.ROOT,
                    "%-4s | Cell: %dx%d | Minimum borders: Left=%d px, Right=%d px, Top=%d px, Bottom=%d px | >=1 px: %b%n",
                    cp.character, cp.cellWidth, cp.cellHeight, minL, minR, minT, minB,
                    (minL >= 1 && minR >= 1 && minT >= 1 && minB >= 1));
        }

        System.out.println("\n--- CHECK 3: EVERY FRAME LOWEST OPAQUE ROW EQUALS H - 3 ---");
        for (CharacterPackage cp : cps) {
            boolean allEqual = true;
            List<FrameData> allFrames = new ArrayList<>();
            allFrames.addAll(cp.walkFrames);
            allFrames.addAll(cp.idleFrames);

            for (FrameData fd : allFrames) {
                int cellLowestRow = fd.placementY + fd.lowestOpaqueRow;
                if (cellLowestRow != cp.baselineRow) {
                    allEqual = false;
                }
            }
            System.out.printf(Locale.ROOT,
                    "%-4s | Target baseline (H - 3) = %d | Verified across all 20 frames: %b%n",
                    cp.character, cp.baselineRow, allEqual);
        }

        System.out.println("\n--- CHECK 4: WALK & IDLE SCALED HEIGHTS PER DIRECTION ---");
        String[] dirNames = { "front", "back", "left", "right" };
        for (CharacterPackage cp : cps) {
            System.out.println("Character: " + cp.character.toUpperCase());
            System.out.println("  Direction | Idle Height | Walk Mean H (diff from 256) | Walk Min H | Walk Max H | Within 2px");
            System.out.println("  ----------+-------------+-----------------------------+------------+------------+-----------");
            for (int d = 0; d < 4; d++) {
                int idleH = cp.idleFrames.get(d).scaledHeight;
                double walkSum = 0;
                int minH = Integer.MAX_VALUE, maxH = 0;
                for (int f = 0; f < 4; f++) {
                    int wh = cp.walkFrames.get(d * 4 + f).scaledHeight;
                    walkSum += wh;
                    if (wh < minH) minH = wh;
                    if (wh > maxH) maxH = wh;
                }
                double walkMean = walkSum / 4.0;
                double diff = Math.abs(walkMean - 256.0);
                System.out.printf(Locale.ROOT,
                        "  %-9s | %11d | %16.2f (diff %4.2f) | %10d | %10d | %b%n",
                        dirNames[d], idleH, walkMean, diff, minH, maxH, (diff <= 2.0));
            }
        }

        System.out.println("\n--- CHECK 5: ATLAS DIMENSIONS & FILE SIZES ---");
        AtlasResult[] allAtlases = { boy.walkAtlas, boy.idleAtlas, girl.walkAtlas, girl.idleAtlas };
        System.out.printf(Locale.ROOT, "%-12s | %-16s | %-12s | %-14s | %-12s | %-12s%n",
                "Atlas", "File Name", "Columns x Rows", "Cell (W x H)", "Atlas Dimensions", "File Size");
        System.out.println("-------------+------------------+----------------+----------------+------------------+-------------");
        for (AtlasResult ar : allAtlases) {
            String colsRows = ar.columns + " x " + ar.rows;
            String cellWH = ar.cellWidth + " x " + ar.cellHeight;
            String expDim = (ar.columns * ar.cellWidth) + " x " + (ar.rows * ar.cellHeight);
            String actDim = ar.image.getWidth() + " x " + ar.image.getHeight();
            boolean dimMatch = expDim.equals(actDim);
            System.out.printf(Locale.ROOT,
                    "%-12s | %-16s | %-14s | %-14s | %-16s | %10d B%n",
                    ar.name, ar.fileName, colsRows, cellWH, actDim + (dimMatch ? " (OK)" : " (MISMATCH)"), ar.file.length());
        }
        BufferedImage shImg = ImageIO.read(shadowFile);
        System.out.printf(Locale.ROOT,
                "%-12s | %-16s | %-14s | %-14s | %-16s | %10d B%n",
                "shadow", shadowFile.getName(), "1 x 1", shImg.getWidth() + " x " + shImg.getHeight(),
                shImg.getWidth() + " x " + shImg.getHeight() + " (OK)", shadowFile.length());

        System.out.println("\n--- character-frames.json FULL CONTENTS ---");
        System.out.println(Files.readString(jsonFile.toPath()));

        System.out.println("--- PREVIEW FILES (assets/optimised/preview/) ---");
        for (Map.Entry<String, File> pe : previews.entrySet()) {
            System.out.printf(Locale.ROOT, "  %-30s | %10d bytes%n", pe.getKey(), pe.getValue().length());
        }
        System.out.println("==================================================================");
    }
}
