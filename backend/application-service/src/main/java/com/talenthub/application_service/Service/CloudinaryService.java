package com.talenthub.application_service.Service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    /**
     * Upload une image et retourne l'URL sécurisée
     */
    public String uploadImage(MultipartFile file, String folder) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide");
        }

        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder", folder != null ? folder : "talenthub/profiles",
                "resource_type", "image",
                "public_id", "profile_" + System.currentTimeMillis(), // nom unique
                "overwrite", true
        ));

        return (String) uploadResult.get("secure_url");   // URL HTTPS sécurisée
    }
}