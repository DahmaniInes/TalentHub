// nomenclature-service/.../Security/PermissionContext.java
package com.talenthub.nomenclature_service.Security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.annotation.RequestScope;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequestScope
public class PermissionContext {

    private final Set<String> permissions;

    public PermissionContext(HttpServletRequest request) {
        String header = request.getHeader("X-User-Permissions");

        if (header != null && !header.isBlank()) {
            // CAS 1 : Gateway a injecté le header
            this.permissions = Arrays.stream(header.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());
        } else {
            // CAS 2 : Fallback — appel HTTP direct vers application-service
            this.permissions = loadFromApplicationService();
        }
    }

    private Set<String> loadFromApplicationService() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (!(auth instanceof JwtAuthenticationToken jwtAuth)) return Collections.emptySet();

            Jwt jwt = (Jwt) jwtAuth.getPrincipal();
            Object raw = jwt.getClaim("profilId");
            if (raw == null) return Collections.emptySet();

            Long profilId = raw instanceof Number n ? n.longValue()
                    : Long.parseLong(raw.toString());

            // Appel HTTP direct vers application-service
            String url = "http://localhost:8081/profil-permissions/profil/"
                    + profilId + "/codes";
            String[] codes = new RestTemplate().getForObject(url, String[].class);
            return codes != null ? new HashSet<>(Arrays.asList(codes)) : Collections.emptySet();

        } catch (Exception e) {
            System.err.println("[NomeclaturePermCtx] Fallback échoué: " + e.getMessage());
            return Collections.emptySet();
        }
    }

    public boolean has(String code) { return permissions.contains(code); }
    public Set<String> getAll()     { return Collections.unmodifiableSet(permissions); }
}