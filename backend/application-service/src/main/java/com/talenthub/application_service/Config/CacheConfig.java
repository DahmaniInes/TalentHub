// application-service/.../Config/CacheConfig.java — REMPLACE
package com.talenthub.application_service.Config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public org.springframework.cache.CacheManager cacheManager(
            RedisConnectionFactory factory) {
        try {
            // ✅ Test de connexion avant de configurer Redis
            factory.getConnection().ping();

            RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofHours(1))
                    .serializeKeysWith(RedisSerializationContext.SerializationPair
                            .fromSerializer(new StringRedisSerializer()))
                    .serializeValuesWith(RedisSerializationContext.SerializationPair
                            .fromSerializer(new GenericJackson2JsonRedisSerializer()));

            System.out.println("✅ Cache Redis connecté");
            return RedisCacheManager.builder(factory)
                    .cacheDefaults(config)
                    .build();

        } catch (Exception e) {
            // ✅ Redis indisponible → cache désactivé, app continue de fonctionner
            System.err.println("⚠️ Redis indisponible, cache désactivé: " + e.getMessage());
            return new NoOpCacheManager();
        }
    }
}