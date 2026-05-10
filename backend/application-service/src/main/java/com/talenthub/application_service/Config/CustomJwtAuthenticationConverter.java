package com.talenthub.application_service.Config;

import com.talenthub.application_service.Service.PermissionCacheService;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class CustomJwtAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    private final PermissionCacheService permissionCacheService;

    public CustomJwtAuthenticationConverter(PermissionCacheService permissionCacheService) {
        this.permissionCacheService = permissionCacheService;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // ── 1. Rôles Keycloak (ROLE_ADMIN, ROLE_RH, etc.) ──
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null) {
            Object rolesObj = realmAccess.get("roles");
            if (rolesObj instanceof List<?> roles) {
                roles.stream()
                        .filter(r -> r instanceof String)
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                        .forEach(authorities::add);
            }
        }

        // ── 2. Permissions depuis le cache (via profilId dans le token) ──
        Long profilId = extractProfilId(jwt);
        if (profilId != null) {
            try {
                Set<String> perms = permissionCacheService.getPermissionsForProfil(profilId);
                perms.stream()
                        .map(SimpleGrantedAuthority::new)  // ex: "CONGE_READ"
                        .forEach(authorities::add);
            } catch (Exception e) {
                // Cache ou BD indisponible : on continue sans permissions custom
                System.err.println("Impossible de charger les permissions pour profilId="
                        + profilId + " : " + e.getMessage());
            }
        }

        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    private Long extractProfilId(Jwt jwt) {
        Object raw = jwt.getClaim("profilId");
        if (raw == null) return null;
        try {
            if (raw instanceof Number n) return n.longValue();
            return Long.parseLong(raw.toString());
        } catch (Exception e) {
            return null;
        }
    }
}