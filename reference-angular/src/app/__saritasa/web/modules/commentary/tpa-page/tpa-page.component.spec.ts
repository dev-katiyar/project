import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TpaPageComponent } from './tpa-page.component';

describe('TpaPageComponent', () => {
  let component: TpaPageComponent;
  let fixture: ComponentFixture<TpaPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TpaPageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TpaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
