// api-gateway/.../Config/FilterConfig.java — REMPLACE
package com.talenthub.api_gateway.config;

import com.talenthub.api_gateway.Filter.PermissionEnricherFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<PermissionEnricherFilter> permissionFilter(
            PermissionEnricherFilter filter) {

        FilterRegistrationBean<PermissionEnricherFilter> bean =
                new FilterRegistrationBean<>(filter);

        bean.addUrlPatterns("/*");  // ✅ Toutes les routes

        // ✅ S'exécute APRÈS Spring Security (order 0)
        // Spring Security filter est à -100, on met 1 pour être juste après
        bean.setOrder(Ordered.LOWEST_PRECEDENCE - 100);

        return bean;
    }
}