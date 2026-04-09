import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilPermissionsComponent } from './profil-permissions.component';

describe('ProfilPermissionsComponent', () => {
  let component: ProfilPermissionsComponent;
  let fixture: ComponentFixture<ProfilPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
