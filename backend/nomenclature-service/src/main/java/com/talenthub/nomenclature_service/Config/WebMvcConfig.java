// nomenclature-service/.../Config/WebMvcConfig.java
package com.talenthub.nomenclature_service.Config;

import com.talenthub.nomenclature_service.Security.PermissionInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final PermissionInterceptor interceptor;

    public WebMvcConfig(PermissionInterceptor interceptor) {
        this.interceptor = interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/actuator/**");
    }
}