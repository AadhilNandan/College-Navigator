package com.cse.navigator.web;

import com.cse.navigator.data.DataFiles;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Optional;

/**
 * Pure helper for safely serving static web assets from the project root.
 * Only allowed paths (/index.html, /style.css, /app.js, /js/**, /data/**, /assets/**)
 * are served; directory traversal and access to src/, pom.xml, .git, etc. are rejected.
 */
public final class StaticFiles {

    private StaticFiles() {}

    /**
     * Finds the project root directory in the same manner as {@link DataFiles}.
     */
    public static Path projectRoot() {
        Path start = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        for (Path dir = start; dir != null; dir = dir.getParent()) {
            Path candidate = dir.resolve("data");
            if (Files.isRegularFile(candidate.resolve(DataFiles.NODES))) {
                return dir;
            }
        }
        throw new IllegalStateException("Could not find project root containing data/nodes.json");
    }

    /**
     * Resolves and validates a request path against the strict allowlist.
     * Returns {@link Optional#empty()} if the path is unauthorized, invalid, or missing.
     */
    public static Optional<Path> resolvePath(String requestPath) {
        if (requestPath == null) return Optional.empty();

        // Reject raw traversal patterns immediately
        if (requestPath.contains("..") || requestPath.contains("%2e") || requestPath.contains("%2E")) {
            return Optional.empty();
        }

        String pathStr = requestPath;
        int qIdx = pathStr.indexOf('?');
        if (qIdx >= 0) {
            pathStr = pathStr.substring(0, qIdx);
        }

        try {
            pathStr = URLDecoder.decode(pathStr, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return Optional.empty();
        }

        // Check again after decoding for any encoded traversal sequences
        if (pathStr.contains("..")) {
            return Optional.empty();
        }

        // Map root / to /index.html
        if (pathStr.equals("/") || pathStr.isEmpty()) {
            pathStr = "/index.html";
        }

        // Normalize leading slashes
        while (pathStr.startsWith("/")) {
            pathStr = pathStr.substring(1);
        }
        pathStr = pathStr.replace('\\', '/');

        // Strictly allow only: /index.html, /style.css, /app.js, /debug.html, /debug.css, /debug.js, /js/**, /data/**, /assets/**
        boolean allowed = pathStr.equals("index.html")
                || pathStr.equals("style.css")
                || pathStr.equals("app.js")
                || pathStr.equals("debug.html")
                || pathStr.equals("debug.css")
                || pathStr.equals("debug.js")
                || pathStr.startsWith("js/")
                || pathStr.startsWith("data/")
                || pathStr.startsWith("assets/");

        if (!allowed) {
            return Optional.empty();
        }

        Path root = projectRoot();
        Path target = root.resolve(pathStr).normalize().toAbsolutePath();

        // Ensure resolution does not escape the project root
        if (!target.startsWith(root)) {
            return Optional.empty();
        }

        if (!Files.isRegularFile(target)) {
            return Optional.empty();
        }

        return Optional.of(target);
    }

    /**
     * Determines the Content-Type header based on file extension.
     */
    public static String getContentType(Path file) {
        String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".html")) return "text/html; charset=utf-8";
        if (name.endsWith(".css")) return "text/css; charset=utf-8";
        if (name.endsWith(".js")) return "text/javascript; charset=utf-8";
        if (name.endsWith(".json")) return "application/json; charset=utf-8";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    /**
     * Serves the requested static file to the HTTP exchange.
     */
    public static void serve(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Method Not Allowed");
            return;
        }

        String path = exchange.getRequestURI().getPath();
        Optional<Path> fileOpt = resolvePath(path);
        if (fileOpt.isEmpty()) {
            sendText(exchange, 404, "Not Found");
            return;
        }

        Path file = fileOpt.get();
        byte[] bytes = Files.readAllBytes(file);
        String contentType = getContentType(file);

        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        if (path.startsWith("/assets/")) {
            exchange.getResponseHeaders().set("Cache-Control", "public, max-age=86400");
        }
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static void sendText(HttpExchange exchange, int status, String text) throws IOException {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
