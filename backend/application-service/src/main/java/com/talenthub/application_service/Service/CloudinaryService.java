// application-service/.../Service/CloudinaryService.java — REMPLACE
// Supporte maintenant images ET documents (PDF, DOC, XLS…)
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
     * Upload image → dossier talenthub/profiles (existant)
     */
    public String uploadImage(MultipartFile file, String folder) throws IOException {
        if (file.isEmpty()) throw new IllegalArgumentException("Le fichier est vide");
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder",        folder != null ? folder : "talenthub/profiles",
                "resource_type", "image",
                "public_id",     "profile_" + System.currentTimeMillis(),
                "overwrite",     true
        ));
        return (String) uploadResult.get("secure_url");
    }

    /**
     * Upload document générique (image, PDF, DOC, XLS…)
     * Utilise resource_type=auto pour laisser Cloudinary détecter
     * ──────────────────────────────────────────────────────────
     * Utilisé par le module réclamations.
     */
    public String uploadDocument(MultipartFile file, String folder) throws IOException {
        if (file.isEmpty()) throw new IllegalArgumentException("Le fichier est vide");

        String originalName = file.getOriginalFilename();
        String publicId = (folder != null ? folder : "talenthub/reclamations")
                + "/rec_" + System.currentTimeMillis();

        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder",        folder != null ? folder : "talenthub/reclamations",
                "resource_type", "auto",   // ← auto détecte image, pdf, vidéo…
                "public_id",     "rec_" + System.currentTimeMillis(),
                "overwrite",     false,
                "use_filename",  true,
                "unique_filename", true
        ));

        return (String) uploadResult.get("secure_url");
    }
}