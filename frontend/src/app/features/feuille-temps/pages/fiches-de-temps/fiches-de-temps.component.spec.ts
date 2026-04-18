import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichesDeTempsComponent } from './fiches-de-temps.component';

describe('FichesDeTempsComponent', () => {
  let component: FichesDeTempsComponent;
  let fixture: ComponentFixture<FichesDeTempsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichesDeTempsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichesDeTempsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
