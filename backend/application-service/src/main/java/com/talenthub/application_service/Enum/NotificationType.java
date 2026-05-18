// src/main/java/com/talenthub/application_service/Enum/NotificationType.java
package com.talenthub.application_service.Enum;

public enum NotificationType {
    // Feuilles de temps
    FEUILLE_SOUMISE,
    FEUILLE_VALIDEE,
    FEUILLE_REJETEE,
    FEUILLE_ANNULEE,
    FEUILLE_MODIFIEE,

    // Demandes (congés, etc.)
    DEMANDE_SOUMISE,
    DEMANDE_VALIDEE,
    DEMANDE_REJETEE,
    DEMANDE_ANNULEE,


    RECLAMATION_SOUMISE,       // Nouvelle réclamation soumise (pour les agents)
    RECLAMATION_RESOLUE,       // Réclamation résolue (pour le demandeur)
    RECLAMATION_REJETEE,       // Réclamation rejetée (pour le demandeur)
    RECLAMATION_COMMENTEE,     // Nouveau commentaire sur une réclamation
    RECLAMATION_MISE_A_JOUR,   // Changement de statut générique


    PROJET_COMMENTAIRE,          // un membre commente un projet
    PROJET_COMMENTAIRE_REPONSE,  // réponse à un commentaire de projet

    // ── Commentaires Activité ──
    ACTIVITE_COMMENTAIRE,        // un membre commente une activité
    ACTIVITE_COMMENTAIRE_REPONSE,

    // ── Projets ──
    PROJET_ASSIGNE,              // un utilisateur est assigné à un projet
    PROJET_STATUT_CHANGE,        // le statut du projet change

    // ── Activités ──
    ACTIVITE_ASSIGNEE,           // une activité est assignée à un groupe/utilisateur
    ACTIVITE_STATUT_CHANGE,

    // ── Général ──
    NOTIFICATION_SEND_MANUAL,
    SYSTEM,

    // Système général
    INFO,
    ALERTE,
    RAPPEL
}