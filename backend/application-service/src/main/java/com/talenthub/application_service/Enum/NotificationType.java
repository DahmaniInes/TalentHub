// src/main/java/com/talenthub/application_service/Enum/NotificationType.java
package com.talenthub.application_service.Enum;

public enum NotificationType {
    // Feuilles de temps
    FEUILLE_SOUMISE,
    FEUILLE_VALIDEE,
    FEUILLE_REJETEE,
    FEUILLE_ANNULEE,

    // Demandes (congés, etc.)
    DEMANDE_SOUMISE,
    DEMANDE_VALIDEE,
    DEMANDE_REJETEE,
    DEMANDE_ANNULEE,

    // Système général
    INFO,
    ALERTE,
    RAPPEL
}