package com.talenthub.application_service.Controller;

import com.talenthub.application_service.Service.OutlookIntegrationService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/outlook")
public class OutlookController {

    private final OutlookIntegrationService integrationService;

    public OutlookController(OutlookIntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    @GetMapping("/connect/{utilisateurId}")
    public ResponseEntity<Map<String, String>> connect(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(Map.of("url", integrationService.buildAuthorizationUrl(utilisateurId)));
    }

    @GetMapping("/callback")
    public void callback(@RequestParam String code, @RequestParam String state,
                         HttpServletResponse response) throws IOException {
        integrationService.handleCallback(code, Long.parseLong(state));
        response.sendRedirect("http://localhost:4200/feuille-temps?page=calendrier&outlook=connecte");
    }

    @GetMapping("/status/{utilisateurId}")
    public ResponseEntity<Map<String, Boolean>> status(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(Map.of("connected", integrationService.isConnected(utilisateurId)));
    }

    @DeleteMapping("/disconnect/{utilisateurId}")
    public ResponseEntity<Void> disconnect(@PathVariable Long utilisateurId) {
        integrationService.disconnect(utilisateurId);
        return ResponseEntity.noContent().build();
    }
}
