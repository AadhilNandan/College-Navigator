package com.cse.navigator.web;

import com.cse.navigator.service.Navigator;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Lightweight HTTP server serving static frontend assets and API endpoints
 * backed by the Java Navigator engine.
 */
public class WebServer {

    public static final String DEFAULT_HOST = "0.0.0.0";
    public static final int DEFAULT_PORT = 8000;

    private final String host;
    private final int port;
    private final ApiService apiService;
    private HttpServer server;

    public WebServer(int port, ApiService apiService) {
        this(DEFAULT_HOST, port, apiService);
    }

    public WebServer(String host, int port, ApiService apiService) {
        this.host = (host != null && !host.isBlank()) ? host : DEFAULT_HOST;
        this.port = port;
        this.apiService = apiService;
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(host, port), 0);
        server.createContext("/", new DispatchHandler(apiService));
        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(32));
        server.start();
        System.out.println("CSE Block Navigator running at:");
        System.out.println("  Local:   http://localhost:" + port + "/");
        try {
            java.util.Enumeration<java.net.NetworkInterface> interfaces = java.net.NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                java.net.NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                java.util.Enumeration<java.net.InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    java.net.InetAddress addr = addresses.nextElement();
                    if (addr instanceof java.net.Inet4Address) {
                        System.out.println("  Network: http://" + addr.getHostAddress() + ":" + port + "/");
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    public int getPort() {
        return port;
    }

    private static class DispatchHandler implements HttpHandler {
        private final ApiService apiService;

        public DispatchHandler(ApiService apiService) {
            this.apiService = apiService;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
                exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "GET, OPTIONS");
                sendText(exchange, 405, "Method Not Allowed");
                return;
            }

            String path = exchange.getRequestURI().getPath();

            if (path.equals("/api/rooms")) {
                String json = apiService.rooms();
                sendJson(exchange, 200, json);
            } else if (path.equals("/api/search")) {
                Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
                String q = params.getOrDefault("q", "");
                String json = apiService.search(q);
                sendJson(exchange, 200, json);
            } else if (path.equals("/api/route")) {
                Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
                String from = params.get("from");
                String to = params.get("to");
                String door = params.get("door");
                String json;
                if (from != null && !from.isBlank()) {
                    json = apiService.routeNodes(from, to);
                } else {
                    json = apiService.route(to, door);
                }
                int status = json.contains("\"error\"") ? 400 : 200;
                sendJson(exchange, status, json);
            } else if (path.startsWith("/api/")) {
                sendJson(exchange, 404, "{\"error\":\"Not Found\"}");
            } else {
                StaticFiles.serve(exchange);
            }
        }

        private Map<String, String> parseQuery(String rawQuery) {
            if (rawQuery == null || rawQuery.isBlank()) return Map.of();
            Map<String, String> map = new HashMap<>();
            for (String pair : rawQuery.split("&")) {
                int idx = pair.indexOf('=');
                if (idx > 0) {
                    String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                    String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                    map.put(key, val);
                } else if (idx < 0 && !pair.isBlank()) {
                    map.put(URLDecoder.decode(pair, StandardCharsets.UTF_8), "");
                }
            }
            return map;
        }

        private void sendJson(HttpExchange exchange, int status, String json) throws IOException {
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(status, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }

        private void sendText(HttpExchange exchange, int status, String text) throws IOException {
            byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(status, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    public static void main(String[] args) throws IOException {
        int port = DEFAULT_PORT;
        String host = DEFAULT_HOST;
        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException e) {
                System.err.println("Invalid port: " + args[0] + ", using default " + DEFAULT_PORT);
            }
        }
        if (args.length > 1) {
            host = args[1];
        }

        Navigator navigator = Navigator.load();
        ApiService apiService = new ApiService(navigator);
        WebServer server = new WebServer(host, port, apiService);
        server.start();
    }
}
