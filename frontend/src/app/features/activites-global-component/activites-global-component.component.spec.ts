import { ComponentFixture, TestBed } from '@angular/core/testing';

// ❌ AVANT (incorrect)
// import { ActivitesGlobalComponentComponent } from './activites-global-component.component';

// ✅ APRÈS (correct)
import { ActivitesGlobalComponent } from './activites-global-component.component';

describe('ActivitesGlobalComponent', () => {  // ← aussi ici
  let component: ActivitesGlobalComponent;     // ← et ici
  let fixture: ComponentFixture<ActivitesGlobalComponent>;  // ← et ici

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivitesGlobalComponent]  // ← et ici
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivitesGlobalComponent);  // ← et ici
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});