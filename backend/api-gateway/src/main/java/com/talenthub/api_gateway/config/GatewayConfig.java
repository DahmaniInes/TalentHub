package com.talenthub.api_gateway.config;

import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.core5.util.Timeout;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.concurrent.TimeUnit;

@Configuration
public class GatewayConfig {

    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder()
                .requestFactory(clientHttpRequestFactory());
    }

    @Bean
    public ClientHttpRequestFactory clientHttpRequestFactory() {

        // ✅ Pool de connexions — taille augmentée pour supporter SSE longue durée
        PoolingHttpClientConnectionManager connectionManager =
                new PoolingHttpClientConnectionManager();
        // Total connexions simultanées (SSE + requêtes normales)
        connectionManager.setMaxTotal(200);
        // Par route (par microservice)
        connectionManager.setDefaultMaxPerRoute(50);

        RequestConfig requestConfig = RequestConfig.custom()
                // Timeout pour établir la connexion TCP
                .setConnectTimeout(Timeout.of(5, TimeUnit.SECONDS))
                // ✅ Timeout pour obtenir une connexion du pool — assez long
                .setConnectionRequestTimeout(Timeout.of(30, TimeUnit.SECONDS))
                // ✅ 0 = infini — nécessaire pour SSE qui reste ouvert
                .setResponseTimeout(Timeout.of(0, TimeUnit.MILLISECONDS))
                .build();

        CloseableHttpClient httpClient = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(requestConfig)
                .build();

        return new HttpComponentsClientHttpRequestFactory(httpClient);
    }
}