package com.cse.navigator.tools;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.List;

/**
 * Character Sprite Analysis Tool (Stage A).
 * Measures connected components, frame bounding boxes, baselines, and pixel-art blockiness.
 * Generates visual diagnostic previews and scale comparison images.
 */
public class SpriteAnalyzer {

    public static final int ALPHA_THRESHOLD = 16;
    public static final int COMPONENT_SIZE_THRESHOLD = 50;

    public static class Component {
        public final int id;
        public int minX;
        public int minY;
        public int maxX;
        public int maxY;
        public int pixelCount;
        public long sumX;
        public long sumY;

        public Component(int id, int x, int y) {
            this.id = id;
            this.minX = x;
            this.maxX = x;
            this.minY = y;
            this.maxY = y;
            this.pixelCount = 1;
            this.sumX = x;
            this.sumY = y;
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

        @Override
        public String toString() {
            return String.format(Locale.ROOT, "[%d,%d to %d,%d] (%dx%d, area=%d, center=%.1f,%.1f)",
                    minX, minY, maxX, maxY, width(), height(), pixelCount, centerX(), centerY());
        }
    }

    public static class FrameBox {
        public final int index;
        public final String label;
        public int minX = Integer.MAX_VALUE;
        public int minY = Integer.MAX_VALUE;
        public int maxX = Integer.MIN_VALUE;
        public int maxY = Integer.MIN_VALUE;
        public int componentCount = 0;
        public int totalPixels = 0;

        public FrameBox(int index, String label) {
            this.index = index;
            this.label = label;
        }

        public void include(Component c) {
            if (c.minX < minX) minX = c.minX;
            if (c.maxX > maxX) maxX = c.maxX;
            if (c.minY < minY) minY = c.minY;
            if (c.maxY > maxY) maxY = c.maxY;
            componentCount++;
            totalPixels += c.pixelCount;
        }

        public int width() { return minX <= maxX ? maxX - minX + 1 : 0; }
        public int height() { return minY <= maxY ? maxY - minY + 1 : 0; }
        public int feetBaseline() { return maxY; }
        public double horizontalCenter() { return (minX + maxX) / 2.0; }

        public Rectangle toRectangle() {
            return new Rectangle(minX, minY, width(), height());
        }
    }

    public static class SheetAnalysis {
        public final String name;
        public final int width;
        public final int height;
        public final List<Component> allComponents;
        public final List<Component> significantComponents;
        public final int speckCount;
        public final List<FrameBox> frames;
        public final List<String> ambiguousOrCrossingNotes;
        public final Map<Integer, Integer> runLengthFrequencies;
        public final double averageRunLength;

        public SheetAnalysis(String name, int width, int height,
                             List<Component> allComponents,
                             List<Component> significantComponents,
                             int speckCount, List<FrameBox> frames,
                             List<String> ambiguousOrCrossingNotes,
                             Map<Integer, Integer> runLengthFrequencies,
                             double averageRunLength) {
            this.name = name;
            this.width = width;
            this.height = height;
            this.allComponents = allComponents;
            this.significantComponents = significantComponents;
            this.speckCount = speckCount;
            this.frames = frames;
            this.ambiguousOrCrossingNotes = ambiguousOrCrossingNotes;
            this.runLengthFrequencies = runLengthFrequencies;
            this.averageRunLength = averageRunLength;
        }
    }

    /**
     * Detects 8-connected components of opaque pixels (alpha > threshold).
     */
    public static List<Component> findConnectedComponents(BufferedImage image, int alphaThreshold) {
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

                int head = 0;
                int tail = 0;
                qx[tail] = x;
                qy[tail] = y;
                tail++;

                while (head < tail) {
                    int cx = qx[head];
                    int cy = qy[head];
                    head++;

                    for (int dy = -1; dy <= 1; dy++) {
                        for (int dx = -1; dx <= 1; dx++) {
                            if (dx == 0 && dy == 0) continue;
                            int nx = cx + dx;
                            int ny = cy + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[nx][ny]) {
                                int nAlpha = (image.getRGB(nx, ny) >>> 24) & 0xFF;
                                if (nAlpha > alphaThreshold) {
                                    visited[nx][ny] = true;
                                    comp.addPixel(nx, ny);
                                    qx[tail] = nx;
                                    qy[tail] = ny;
                                    tail++;
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
     * Analyses horizontal run lengths of identical colors to assess true pixel grid blockiness.
     */
    public static RunAnalysisResult measureColorRunLengths(BufferedImage image, int alphaThreshold) {
        int w = image.getWidth();
        int h = image.getHeight();
        Map<Integer, Integer> freq = new TreeMap<>();
        long totalRuns = 0;
        long totalPixelsInRuns = 0;

        for (int y = 0; y < h; y++) {
            int currentRun = 0;
            int lastRgb = 0;
            boolean inRun = false;

            for (int x = 0; x < w; x++) {
                int rgb = image.getRGB(x, y);
                int alpha = (rgb >>> 24) & 0xFF;
                if (alpha <= alphaThreshold) {
                    if (inRun) {
                        freq.put(currentRun, freq.getOrDefault(currentRun, 0) + 1);
                        totalRuns++;
                        totalPixelsInRuns += currentRun;
                        inRun = false;
                        currentRun = 0;
                    }
                } else {
                    if (!inRun) {
                        inRun = true;
                        lastRgb = rgb;
                        currentRun = 1;
                    } else if (rgb == lastRgb) {
                        currentRun++;
                    } else {
                        freq.put(currentRun, freq.getOrDefault(currentRun, 0) + 1);
                        totalRuns++;
                        totalPixelsInRuns += currentRun;
                        lastRgb = rgb;
                        currentRun = 1;
                    }
                }
            }
            if (inRun) {
                freq.put(currentRun, freq.getOrDefault(currentRun, 0) + 1);
                totalRuns++;
                totalPixelsInRuns += currentRun;
            }
        }

        double avg = totalRuns > 0 ? (double) totalPixelsInRuns / totalRuns : 0;
        return new RunAnalysisResult(freq, avg, totalRuns);
    }

    public static class RunAnalysisResult {
        public final Map<Integer, Integer> frequencies;
        public final double averageRunLength;
        public final long totalRuns;

        public RunAnalysisResult(Map<Integer, Integer> frequencies, double averageRunLength, long totalRuns) {
            this.frequencies = frequencies;
            this.averageRunLength = averageRunLength;
            this.totalRuns = totalRuns;
        }
    }

    /**
     * Analyses a 4x4 Walk Sheet (1024x1536, nominal cells 256x384).
     */
    public static SheetAnalysis analyzeWalkSheet(String name, BufferedImage image) {
        int w = image.getWidth();
        int h = image.getHeight();
        int cellW = 256;
        int cellH = 384;
        String[] dirNames = { "front", "back", "left", "right" };

        List<Component> components = findConnectedComponents(image, ALPHA_THRESHOLD);
        List<Component> significant = new ArrayList<>();
        int specks = 0;
        for (Component c : components) {
            if (c.pixelCount >= COMPONENT_SIZE_THRESHOLD) {
                significant.add(c);
            } else {
                specks++;
            }
        }

        // Initialize 16 frames
        List<FrameBox> frames = new ArrayList<>(16);
        for (int r = 0; r < 4; r++) {
            for (int c = 0; c < 4; c++) {
                int idx = r * 4 + c;
                frames.add(new FrameBox(idx, String.format("%s_frame_%d", dirNames[r], c + 1)));
            }
        }

        List<String> crossingNotes = new ArrayList<>();

        // Group components: assign each component by centroid to (row, col)
        for (Component comp : components) {
            int col = Math.min(3, Math.max(0, (int) (comp.centroidX() / cellW)));
            int row = Math.min(3, Math.max(0, (int) (comp.centroidY() / cellH)));
            int frameIdx = row * 4 + col;

            frames.get(frameIdx).include(comp);

            // Check boundary crossing of the nominal cell
            int nominalMinX = col * cellW;
            int nominalMaxX = (col + 1) * cellW - 1;
            int nominalMinY = row * cellH;
            int nominalMaxY = (row + 1) * cellH - 1;

            if (comp.minX < nominalMinX || comp.maxX > nominalMaxX ||
                comp.minY < nominalMinY || comp.maxY > nominalMaxY) {
                if (comp.pixelCount >= COMPONENT_SIZE_THRESHOLD) {
                    crossingNotes.add(String.format(Locale.ROOT,
                            "Component #%d (pixels=%d, bbox=[%d,%d to %d,%d]) crosses nominal cell [%d,%d to %d,%d] (frame %s)",
                            comp.id, comp.pixelCount, comp.minX, comp.minY, comp.maxX, comp.maxY,
                            nominalMinX, nominalMinY, nominalMaxX, nominalMaxY, frames.get(frameIdx).label));
                }
            }
        }

        RunAnalysisResult runs = measureColorRunLengths(image, ALPHA_THRESHOLD);
        return new SheetAnalysis(name, w, h, components, significant, specks, frames, crossingNotes, runs.frequencies, runs.averageRunLength);
    }

    /**
     * Analyses a 4-direction Idle Sheet (1983x793, 4 figures arranged left to right).
     */
    public static SheetAnalysis analyzeIdleSheet(String name, BufferedImage image) {
        int w = image.getWidth();
        int h = image.getHeight();
        String[] dirNames = { "front", "back", "left", "right" };

        List<Component> components = findConnectedComponents(image, ALPHA_THRESHOLD);
        List<Component> significant = new ArrayList<>();
        int specks = 0;
        for (Component c : components) {
            if (c.pixelCount >= COMPONENT_SIZE_THRESHOLD) {
                significant.add(c);
            } else {
                specks++;
            }
        }

        // Identify the 4 largest primary body components
        List<Component> bySize = new ArrayList<>(significant);
        bySize.sort((a, b) -> Integer.compare(b.pixelCount, a.pixelCount));

        List<Component> bodies = new ArrayList<>();
        for (int i = 0; i < Math.min(4, bySize.size()); i++) {
            bodies.add(bySize.get(i));
        }
        // Sort the 4 primary bodies left-to-right (front, back, left, right)
        bodies.sort(Comparator.comparingDouble(Component::centerX));

        List<FrameBox> frames = new ArrayList<>(4);
        for (int i = 0; i < 4; i++) {
            frames.add(new FrameBox(i, dirNames[i]));
        }

        List<String> notes = new ArrayList<>();

        // Grouping rule for idle sheets: each component joins the body it overlaps
        // horizontally, or the nearest body center
        for (Component comp : components) {
            int bestIdx = 0;
            double bestDist = Double.MAX_VALUE;

            for (int i = 0; i < bodies.size(); i++) {
                Component body = bodies.get(i);
                // Check horizontal overlap
                boolean overlapsX = comp.minX <= body.maxX && comp.maxX >= body.minX;
                if (overlapsX) {
                    bestIdx = i;
                    break;
                }
                double dist = Math.abs(comp.centerX() - body.centerX());
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }

            frames.get(bestIdx).include(comp);
        }

        RunAnalysisResult runs = measureColorRunLengths(image, ALPHA_THRESHOLD);
        return new SheetAnalysis(name, w, h, components, significant, specks, frames, notes, runs.frequencies, runs.averageRunLength);
    }

    /**
     * Generates a preview image with nominal grid in blue and detected frame boxes in red.
     */
    public static File generatePreview(SheetAnalysis analysis, BufferedImage original, File outputDir) throws IOException {
        int origW = original.getWidth();
        int origH = original.getHeight();

        int targetW = Math.min(1200, origW);
        double scale = (double) targetW / origW;
        int targetH = (int) Math.round(origH * scale);

        BufferedImage preview = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2 = preview.createGraphics();

        // Draw scaled original
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2.drawImage(original, 0, 0, targetW, targetH, null);

        // Draw nominal grid in blue
        g2.setColor(new Color(0, 100, 255, 180));
        g2.setStroke(new BasicStroke(1.5f));
        if (analysis.frames.size() == 16) {
            // Walk grid 4x4
            for (int c = 1; c < 4; c++) {
                int x = (int) Math.round(c * 256 * scale);
                g2.drawLine(x, 0, x, targetH);
            }
            for (int r = 1; r < 4; r++) {
                int y = (int) Math.round(r * 384 * scale);
                g2.drawLine(0, y, targetW, y);
            }
        } else if (analysis.frames.size() == 4) {
            // Idle approximate 4 columns
            for (int i = 1; i < 4; i++) {
                int x = (int) Math.round((i * (origW / 4.0)) * scale);
                g2.drawLine(x, 0, x, targetH);
            }
        }

        // Draw detected frame bounding boxes in red
        g2.setColor(new Color(255, 0, 0, 230));
        g2.setStroke(new BasicStroke(2.0f));
        for (FrameBox fb : analysis.frames) {
            int rx = (int) Math.round(fb.minX * scale);
            int ry = (int) Math.round(fb.minY * scale);
            int rw = (int) Math.round(fb.width() * scale);
            int rh = (int) Math.round(fb.height() * scale);
            g2.drawRect(rx, ry, rw, rh);
        }

        g2.dispose();

        File outFile = new File(outputDir, "preview_" + analysis.name + ".png");
        ImageIO.write(preview, "png", outFile);
        return outFile;
    }

    /**
     * Generates scale_test.png comparing scaling methods on the first walk frame.
     */
    public static File generateScaleTest(BufferedImage boyWalkImage, FrameBox firstFrame, File outputDir) throws IOException {
        BufferedImage cropped = boyWalkImage.getSubimage(
                firstFrame.minX, firstFrame.minY, firstFrame.width(), firstFrame.height());

        double aspect = (double) cropped.getWidth() / cropped.getHeight();

        int hA = 96;
        int wA = (int) Math.round(hA * aspect);

        int hB = 96;
        int wB = (int) Math.round(hB * aspect);

        int hC = 128;
        int wC = (int) Math.round(hC * aspect);

        // (a) 96 px tall nearest-neighbour
        BufferedImage imgA = new BufferedImage(wA, hA, BufferedImage.TYPE_INT_ARGB);
        Graphics2D gA = imgA.createGraphics();
        gA.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        gA.drawImage(cropped, 0, 0, wA, hA, null);
        gA.dispose();

        // (b) 96 px tall area-averaging (smooth)
        Image scaledB = cropped.getScaledInstance(wB, hB, Image.SCALE_AREA_AVERAGING);
        BufferedImage imgB = new BufferedImage(wB, hB, BufferedImage.TYPE_INT_ARGB);
        Graphics2D gB = imgB.createGraphics();
        gB.drawImage(scaledB, 0, 0, null);
        gB.dispose();

        // (c) 128 px tall area-averaging (smooth)
        Image scaledC = cropped.getScaledInstance(wC, hC, Image.SCALE_AREA_AVERAGING);
        BufferedImage imgC = new BufferedImage(wC, hC, BufferedImage.TYPE_INT_ARGB);
        Graphics2D gC = imgC.createGraphics();
        gC.drawImage(scaledC, 0, 0, null);
        gC.dispose();

        // Place side by side on magenta background
        int pad = 16;
        int stripW = pad + wA + pad + wB + pad + wC + pad;
        int stripH = pad * 2 + 128;

        BufferedImage strip = new BufferedImage(stripW, stripH, BufferedImage.TYPE_INT_RGB);
        Graphics2D gStrip = strip.createGraphics();
        // Magenta background
        gStrip.setColor(new Color(255, 0, 255));
        gStrip.fillRect(0, 0, stripW, stripH);

        // Draw (a) bottom-aligned to y = pad + 128
        int yA = pad + (128 - hA);
        gStrip.drawImage(imgA, pad, yA, null);

        // Draw (b) bottom-aligned
        int xB = pad + wA + pad;
        int yB = pad + (128 - hB);
        gStrip.drawImage(imgB, xB, yB, null);

        // Draw (c) bottom-aligned
        int xC = xB + wB + pad;
        int yC = pad + (128 - hC);
        gStrip.drawImage(imgC, xC, yC, null);
        gStrip.dispose();

        // Enlarge 4x with nearest-neighbour
        int finalW = stripW * 4;
        int finalH = stripH * 4;
        BufferedImage enlarged = new BufferedImage(finalW, finalH, BufferedImage.TYPE_INT_RGB);
        Graphics2D gFinal = enlarged.createGraphics();
        gFinal.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        gFinal.drawImage(strip, 0, 0, finalW, finalH, null);
        gFinal.dispose();

        File outFile = new File(outputDir, "scale_test.png");
        ImageIO.write(enlarged, "png", outFile);
        return outFile;
    }

    public static void main(String[] args) throws Exception {
        System.out.println("==================================================================");
        System.out.println("          CHARACTER SPRITE ANALYSIS REPORT (STAGE A)             ");
        System.out.println("==================================================================");
        System.out.println("Opacity threshold: alpha > " + ALPHA_THRESHOLD + " (alpha values <= 16 treated as transparent)");
        System.out.println("Connected components: 8-connectivity");
        System.out.println("Significant component threshold: >= " + COMPONENT_SIZE_THRESHOLD + " pixels\n");

        Path projectRoot = Path.of("").toAbsolutePath();
        Path charDir = projectRoot.resolve("assets").resolve("character");
        Path previewDir = projectRoot.resolve("assets").resolve("optimised").resolve("preview");
        Files.createDirectories(previewDir);

        String[] sheets = {
            "boy_main_walk_4dir.png",
            "girl_main_walk_4dir.png",
            "boy_main_idle_4dir.png",
            "girl_main_idle_4dir.png"
        };

        Map<String, SheetAnalysis> analyses = new LinkedHashMap<>();
        Map<String, File> previewFiles = new LinkedHashMap<>();
        BufferedImage boyWalkImg = null;

        for (String sheetName : sheets) {
            Path filePath = charDir.resolve(sheetName);
            if (!Files.exists(filePath)) {
                System.err.println("File not found: " + filePath);
                continue;
            }

            BufferedImage img = ImageIO.read(filePath.toFile());
            SheetAnalysis analysis;
            if (sheetName.contains("walk")) {
                analysis = analyzeWalkSheet(sheetName.replace(".png", ""), img);
                if (sheetName.equals("boy_main_walk_4dir.png")) {
                    boyWalkImg = img;
                }
            } else {
                analysis = analyzeIdleSheet(sheetName.replace(".png", ""), img);
            }
            analyses.put(sheetName, analysis);

            File previewFile = generatePreview(analysis, img, previewDir.toFile());
            previewFiles.put(previewFile.getName(), previewFile);
        }

        // Generate scale_test.png
        if (boyWalkImg != null && analyses.containsKey("boy_main_walk_4dir.png")) {
            FrameBox firstFrame = analyses.get("boy_main_walk_4dir.png").frames.get(0);
            File scaleFile = generateScaleTest(boyWalkImg, firstFrame, previewDir.toFile());
            previewFiles.put(scaleFile.getName(), scaleFile);
        }

        // -------------------------------------------------------------
        // Report 1 & 2: Component Summary
        // -------------------------------------------------------------
        System.out.println("--- 1. CONNECTED COMPONENTS PER SHEET ---");
        for (Map.Entry<String, SheetAnalysis> entry : analyses.entrySet()) {
            SheetAnalysis sa = entry.getValue();
            System.out.printf(Locale.ROOT,
                    "%-26s | Dimensions: %4dx%4d | Total Components: %4d | Significant (>=50px): %2d | Specks (<50px): %4d%n",
                    entry.getKey(), sa.width, sa.height, sa.allComponents.size(), sa.significantComponents.size(), sa.speckCount);
        }

        // -------------------------------------------------------------
        // Report 3: Grouping Rules & Boundary Crossings
        // -------------------------------------------------------------
        System.out.println("\n--- 2. GROUPING RULES & CELL BOUNDARY CROSSINGS ---");
        System.out.println("Grouping rule for Walk sheets (4x4, nominal 256x384):");
        System.out.println("  Each connected component is assigned to the nominal cell containing its centroid.");
        System.out.println("  All components assigned to a cell are unioned to form that frame's tight bounding box.");
        System.out.println("\nGrouping rule for Idle sheets (1x4, 4 horizontal figures):");
        System.out.println("  The 4 largest connected components represent the primary character bodies (sorted left-to-right).");
        System.out.println("  Every other component is grouped with the body it horizontally overlaps, or the nearest body center.");

        System.out.println("\nBoundary Crossing / Ambiguity Report:");
        for (Map.Entry<String, SheetAnalysis> entry : analyses.entrySet()) {
            SheetAnalysis sa = entry.getValue();
            System.out.println("Sheet [" + entry.getKey() + "]:");
            if (sa.ambiguousOrCrossingNotes.isEmpty()) {
                System.out.println("  None. All significant components stay within nominal cell limits.");
            } else {
                for (String note : sa.ambiguousOrCrossingNotes) {
                    System.out.println("  " + note);
                }
            }
        }

        // -------------------------------------------------------------
        // Report 4: Frame Dimensions Table (Full for boy_main_walk_4dir)
        // -------------------------------------------------------------
        System.out.println("\n--- 3. FRAME DIMENSIONS: boy_main_walk_4dir.png (FULL TABLE) ---");
        System.out.println("Row/Dir  | Frame | Bounding Box [minX,minY to maxX,maxY] | Width | Height | Baseline (lowest Y) | Center X");
        System.out.println("---------+-------+---------------------------------------+-------+--------+---------------------+---------");
        SheetAnalysis boyWalk = analyses.get("boy_main_walk_4dir.png");
        if (boyWalk != null) {
            String[] dirNames = { "front", "back ", "left ", "right" };
            for (int r = 0; r < 4; r++) {
                for (int c = 0; c < 4; c++) {
                    int idx = r * 4 + c;
                    FrameBox fb = boyWalk.frames.get(idx);
                    System.out.printf(Locale.ROOT,
                            "%-8s | %-5d | [%4d, %4d to %4d, %4d]         | %5d | %6d | %19d | %8.1f%n",
                            dirNames[r], c + 1, fb.minX, fb.minY, fb.maxX, fb.maxY, fb.width(), fb.height(), fb.feetBaseline(), fb.horizontalCenter());
                }
            }
        }

        // -------------------------------------------------------------
        // Summary for other sheets: Min, Max, Spread
        // -------------------------------------------------------------
        System.out.println("\n--- 4. FRAME DIMENSION SUMMARY: OTHER SHEETS ---");
        for (Map.Entry<String, SheetAnalysis> entry : analyses.entrySet()) {
            if (entry.getKey().equals("boy_main_walk_4dir.png")) continue;
            SheetAnalysis sa = entry.getValue();
            System.out.println("\nSheet: " + entry.getKey() + " (" + sa.frames.size() + " frames)");

            if (sa.frames.size() == 16) {
                // Walk sheet by row
                String[] dirNames = { "front", "back", "left", "right" };
                System.out.println("  Direction | Width (min..max, spread) | Height (min..max, spread) | Baseline (min..max, spread)");
                System.out.println("  ----------+--------------------------+---------------------------+----------------------------");
                for (int r = 0; r < 4; r++) {
                    int minW = Integer.MAX_VALUE, maxW = 0;
                    int minH = Integer.MAX_VALUE, maxH = 0;
                    int minB = Integer.MAX_VALUE, maxB = 0;
                    for (int c = 0; c < 4; c++) {
                        FrameBox fb = sa.frames.get(r * 4 + c);
                        if (fb.width() < minW) minW = fb.width();
                        if (fb.width() > maxW) maxW = fb.width();
                        if (fb.height() < minH) minH = fb.height();
                        if (fb.height() > maxH) maxH = fb.height();
                        if (fb.feetBaseline() < minB) minB = fb.feetBaseline();
                        if (fb.feetBaseline() > maxB) maxB = fb.feetBaseline();
                    }
                    System.out.printf(Locale.ROOT,
                            "  %-9s | %3d .. %3d (spread %2d)     | %3d .. %3d (spread %2d)      | %4d .. %4d (spread %2d)%n",
                            dirNames[r], minW, maxW, maxW - minW, minH, maxH, maxH - minH, minB, maxB, maxB - minB);
                }
            } else {
                // Idle sheet
                System.out.println("  Frame/Dir | Bounding Box [minX,minY to maxX,maxY] | Width | Height | Baseline (lowest Y) | Center X");
                System.out.println("  ----------+---------------------------------------+-------+--------+---------------------+---------");
                for (FrameBox fb : sa.frames) {
                    System.out.printf(Locale.ROOT,
                            "  %-9s | [%4d, %4d to %4d, %4d]         | %5d | %6d | %19d | %8.1f%n",
                            fb.label, fb.minX, fb.minY, fb.maxX, fb.maxY, fb.width(), fb.height(), fb.feetBaseline(), fb.horizontalCenter());
                }
            }
        }

        // -------------------------------------------------------------
        // Report 5: Maximum frame sizes & character size comparison
        // -------------------------------------------------------------
        System.out.println("\n--- 5. MAXIMUM FRAME DIMENSIONS & CHARACTER COMPARISON ---");
        int boyMaxW = 0, boyMaxH = 0;
        int girlMaxW = 0, girlMaxH = 0;

        for (Map.Entry<String, SheetAnalysis> entry : analyses.entrySet()) {
            boolean isBoy = entry.getKey().startsWith("boy");
            for (FrameBox fb : entry.getValue().frames) {
                if (isBoy) {
                    if (fb.width() > boyMaxW) boyMaxW = fb.width();
                    if (fb.height() > boyMaxH) boyMaxH = fb.height();
                } else {
                    if (fb.width() > girlMaxW) girlMaxW = fb.width();
                    if (fb.height() > girlMaxH) girlMaxH = fb.height();
                }
            }
        }

        System.out.printf(Locale.ROOT, "Boy  Characters -> Max Frame Width: %d px | Max Frame Height: %d px%n", boyMaxW, boyMaxH);
        System.out.printf(Locale.ROOT, "Girl Characters -> Max Frame Width: %d px | Max Frame Height: %d px%n", girlMaxW, girlMaxH);
        System.out.println("Size match verdict: " +
                (boyMaxW == girlMaxW && boyMaxH == girlMaxH
                    ? "Boy and girl frames match exactly in size."
                    : String.format(Locale.ROOT, "Boy and girl frames DO NOT match in size (diff: width Δ=%d px, height Δ=%d px).",
                            Math.abs(boyMaxW - girlMaxW), Math.abs(boyMaxH - girlMaxH))));

        // -------------------------------------------------------------
        // Report 6: Pixel Grid / Blockiness Analysis
        // -------------------------------------------------------------
        System.out.println("\n--- 6. PIXEL GRID VS HIGH-RES ART ANALYSIS ---");
        for (Map.Entry<String, SheetAnalysis> entry : analyses.entrySet()) {
            SheetAnalysis sa = entry.getValue();
            System.out.println("Sheet [" + entry.getKey() + "]:");
            System.out.printf(Locale.ROOT, "  Average identical-colour run length: %.2f pixels%n", sa.averageRunLength);
            System.out.print("  Top run lengths (length: count): ");
            int printed = 0;
            for (Map.Entry<Integer, Integer> fe : sa.runLengthFrequencies.entrySet()) {
                System.out.printf("%dpx:%d  ", fe.getKey(), fe.getValue());
                if (++printed >= 8) break;
            }
            System.out.println();
        }

        // -------------------------------------------------------------
        // Report 7: Preview Files List & Exact Bytes
        // -------------------------------------------------------------
        System.out.println("\n--- 7. GENERATED PREVIEW FILES ---");
        System.out.println("Folder: assets/optimised/preview/");
        for (Map.Entry<String, File> entry : previewFiles.entrySet()) {
            File f = entry.getValue();
            System.out.printf(Locale.ROOT, "  %-32s | %8d bytes%n", entry.getKey(), f.length());
        }
        System.out.println("==================================================================");
    }
}
