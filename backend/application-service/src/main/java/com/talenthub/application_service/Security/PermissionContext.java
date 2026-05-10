// Security/PermissionContext.java — REMPLACE le fichier entier
package com.talenthub.application_service.Security;

import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequestScope
public class PermissionContext {

    private final Set<String> permissions;

    public PermissionContext(HttpServletRequest request,
                             ProfilPermissionRepository profilPermRepo) {

        String header = request.getHeader("X-User-Permissions");

        if (header != null && !header.isBlank()) {
            // CAS 1 : Gateway a injecté le header
            this.permissions = Arrays.stream(header.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());
            System.out.println("[PermCtx] CAS 1 header: "
                    + this.permissions.size() + " permissions");

        } else {
            // CAS 2 : Fallback BD via JWT
            this.permissions = loadPermissionCodesFromJwt(profilPermRepo);
            System.out.println("[PermCtx] CAS 2 BD fallback: "
                    + this.permissions.size() + " permissions: " + this.permissions);
        }
    }

    private Set<String> loadPermissionCodesFromJwt(ProfilPermissionRepository repo) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
                return Collections.emptySet();
            }

            Jwt jwt = (Jwt) jwtAuth.getPrincipal();
            Object raw = jwt.getClaim("profilId");
            if (raw == null) return Collections.emptySet();

            Long profilId = raw instanceof Number n ? n.longValue()
                    : Long.parseLong(raw.toString());

            // ✅ NOUVEAU — utilise la requête directe (pas de lazy loading)
            List<String> codes = repo.findPermissionCodesByProfilId(profilId);
            return new HashSet<>(codes);

        } catch (Exception e) {
            System.err.println("[PermCtx] Erreur fallback BD: " + e.getMessage());
            return Collections.emptySet();
        }
    }

    public boolean has(String code) {
        return permissions.contains(code);
    }

    public Set<String> getAll() {
        return Collections.unmodifiableSet(permissions);
    }
}