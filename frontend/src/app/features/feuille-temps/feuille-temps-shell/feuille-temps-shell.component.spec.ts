import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeuilleTempsShellComponent } from './feuille-temps-shell.component';

describe('FeuilleTempsShellComponent', () => {
  let component: FeuilleTempsShellComponent;
  let fixture: ComponentFixture<FeuilleTempsShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeuilleTempsShellComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeuilleTempsShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
