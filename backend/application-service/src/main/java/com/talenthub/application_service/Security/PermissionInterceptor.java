// application-service/.../Security/PermissionInterceptor.java — REMPLACE
package com.talenthub.application_service.Security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class PermissionInterceptor implements HandlerInterceptor {

    private final PermissionContext permissionContext;

    public PermissionInterceptor(PermissionContext permissionContext) {
        this.permissionContext = permissionContext;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        if (!(handler instanceof HandlerMethod method)) return true;

        RequiresPermission annotation = method.getMethodAnnotation(RequiresPermission.class);
        if (annotation == null) return true;

        for (String code : annotation.value()) {
            if (!permissionContext.has(code)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json;charset=UTF-8");
                // ✅ Message structuré que Angular peut lire
                response.getWriter().write(
                        "{\"error\":\"PERMISSION_DENIED\"," +
                                "\"permission\":\"" + code + "\"," +
                                "\"message\":\"Vous n'avez pas la permission d'effectuer cette action.\"}"
                );
                return false;
            }
        }
        return true;
    }
}