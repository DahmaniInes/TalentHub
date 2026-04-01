package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Utilisateur;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender, TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    /**
     * Envoie un email de bienvenue avec un lien pour définir le mot de passe
     */
    public void sendWelcomeEmail(Utilisateur utilisateur) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(utilisateur.getEmail());
            helper.setSubject("Bienvenue chez TalentHub - Définissez votre mot de passe");

            // Préparer les données pour le template
            Context context = new Context();
            context.setVariable("nomComplet", utilisateur.getNomComplet());
            context.setVariable("email", utilisateur.getEmail());
            context.setVariable("frontendUrl", frontendUrl);
            context.setVariable("year", java.time.Year.now().getValue());

            // Générer le contenu HTML à partir du template
            String htmlContent = templateEngine.process("welcome-email", context);

            helper.setText(htmlContent, true); // true = HTML

            mailSender.send(message);

            System.out.println("✅ Email de bienvenue envoyé à : " + utilisateur.getEmail());

        } catch (MessagingException e) {
            System.err.println("❌ Erreur lors de l'envoi de l'email à " + utilisateur.getEmail());
            e.printStackTrace();
            // Tu peux logger l'erreur ou la gérer autrement
        }
    }
}