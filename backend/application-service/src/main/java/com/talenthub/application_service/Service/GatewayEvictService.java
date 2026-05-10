package com.talenthub.application_service.Service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class GatewayEvictService {

    private final StringRedisTemplate redis;

    public GatewayEvictService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void evict(Long profilId) {
        try {
            String key = "perms:profil:" + profilId;
            Boolean deleted = redis.delete(key);
            System.out.println("✅ Cache évicté pour profilId=" + profilId
                    + " (deleted=" + deleted + ")");
        } catch (Exception e) {
            System.err.println("⚠️ Evict Redis échoué: " + e.getMessage());
        }
    }

    public void evictAll() {
        try {
            var keys = redis.keys("perms:profil:*");
            if (keys != null && !keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception e) {
            System.err.println("⚠️ Redis indisponible, éviction globale ignorée: " + e.getMessage());
        }
    }
}