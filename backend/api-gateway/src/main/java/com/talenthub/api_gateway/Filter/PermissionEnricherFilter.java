// api-gateway/.../Filter/PermissionEnricherFilter.java — REMPLACE
package com.talenthub.api_gateway.Filter;

import com.talenthub.api_gateway.Service.PermissionCacheService;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.*;

@Component
public class PermissionEnricherFilter implements Filter {

    private final PermissionCacheService cacheService;

    public PermissionEnricherFilter(PermissionCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @Override
    public void doFilter(ServletRequest servletRequest,
                         ServletResponse servletResponse,
                         FilterChain chain) throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) servletRequest;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            chain.doFilter(request, servletResponse);
            return;
        }

        Jwt jwt = (Jwt) jwtAuth.getPrincipal();
        Long profilId = extractProfilId(jwt);

        if (profilId == null) {
            chain.doFilter(request, servletResponse);
            return;
        }

        // ✅ Extraire le token brut depuis le header Authorization
        String authHeader = request.getHeader("Authorization");
        String rawToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            rawToken = authHeader.substring(7);
        }

        // ✅ Charger permissions depuis Redis (ou service avec token)
        String permissions = cacheService.getPermissionsAsHeader(profilId, rawToken);

        System.out.println("[Gateway Filter] URI=" + request.getRequestURI()
                + " profilId=" + profilId
                + " permissions='" + permissions + "'");

        // Injecter dans la requête
        HttpServletRequest mutated = new HeaderInjectingRequestWrapper(request,
                Map.of(
                        "X-User-Permissions", permissions != null ? permissions : "",
                        "X-User-ProfilId",    String.valueOf(profilId),
                        "X-User-Id",          jwt.getSubject() != null ? jwt.getSubject() : ""
                )
        );

        chain.doFilter(mutated, servletResponse);
    }

    private Long extractProfilId(Jwt jwt) {
        Object raw = jwt.getClaim("profilId");
        if (raw == null) return null;
        try {
            if (raw instanceof Number n) return n.longValue();
            return Long.parseLong(raw.toString());
        } catch (Exception e) { return null; }
    }

    private static class HeaderInjectingRequestWrapper extends HttpServletRequestWrapper {

        private final Map<String, String> extraHeaders;

        public HeaderInjectingRequestWrapper(HttpServletRequest request,
                                             Map<String, String> extraHeaders) {
            super(request);
            this.extraHeaders = new HashMap<>(extraHeaders);
        }

        @Override
        public String getHeader(String name) {
            String val = extraHeaders.get(name);
            return val != null ? val : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (extraHeaders.containsKey(name))
                return Collections.enumeration(List.of(extraHeaders.get(name)));
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> names = new ArrayList<>(
                    Collections.list(super.getHeaderNames()));
            names.addAll(extraHeaders.keySet());
            return Collections.enumeration(names);
        }
    }
}