package com.talenthub.application_service.DTO;

import lombok.Getter; import lombok.Builder;

@Getter @Builder
public class SoldeCongeDTO {
    private double tauxMensuel;
    private double moisEcoules;
    private double acquis;
    private double report;
    private double pris;
    private double solde;
    private int annee;
}