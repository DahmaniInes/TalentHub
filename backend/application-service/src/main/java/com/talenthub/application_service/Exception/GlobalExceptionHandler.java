package com.talenthub.application_service.Exception;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), "RESOURCE_NOT_FOUND");
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicate(DuplicateResourceException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), "DUPLICATE_RESOURCE");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> fields.put(e.getField(), e.getDefaultMessage()));
        Map<String, Object> body = baseError(HttpStatus.BAD_REQUEST, "Données invalides", "VALIDATION_ERROR");
        body.put("fields", fields);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        String msg = ex.getMessage();
        // Détecter les erreurs Keycloak spécifiques
        if (msg != null && msg.contains("409")) {
            return error(HttpStatus.CONFLICT, "Un utilisateur avec cet email existe déjà.", "DUPLICATE_EMAIL");
        }
        if (msg != null && msg.contains("403")) {
            return error(HttpStatus.FORBIDDEN, "Permission insuffisante pour effectuer cette action.", "KEYCLOAK_FORBIDDEN");
        }
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur interne est survenue.", "INTERNAL_ERROR");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur inattendue.", "UNEXPECTED_ERROR");
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message, String code) {
        return ResponseEntity.status(status).body(baseError(status, message, code));
    }

    private Map<String, Object> baseError(HttpStatus status, String message, String code) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", code);
        body.put("message", message);
        return body;
    }
}
