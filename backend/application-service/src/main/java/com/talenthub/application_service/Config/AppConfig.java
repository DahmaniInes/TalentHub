// src/main/java/com/talenthub/application_service/Config/AppConfig.java
package com.talenthub.application_service.Config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    /**
     * Bean RestTemplate partagé dans application-service.
     * Utilisé par ActiviteService pour appeler nomenclature-service.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}