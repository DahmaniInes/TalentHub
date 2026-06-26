import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentEspaceStageComponent } from './document-espace-stage.component';

describe('DocumentEspaceStageComponent', () => {
  let component: DocumentEspaceStageComponent;
  let fixture: ComponentFixture<DocumentEspaceStageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentEspaceStageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentEspaceStageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
