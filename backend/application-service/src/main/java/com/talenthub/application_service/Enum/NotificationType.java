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

    // Système général
    INFO,
    ALERTE,
    RAPPEL
}