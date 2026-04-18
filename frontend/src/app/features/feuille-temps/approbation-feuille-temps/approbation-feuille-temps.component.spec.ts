import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprobationFeuilleTempsComponent } from './approbation-feuille-temps.component';

describe('ApprobationFeuilleTempsComponent', () => {
  let component: ApprobationFeuilleTempsComponent;
  let fixture: ComponentFixture<ApprobationFeuilleTempsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprobationFeuilleTempsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprobationFeuilleTempsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
