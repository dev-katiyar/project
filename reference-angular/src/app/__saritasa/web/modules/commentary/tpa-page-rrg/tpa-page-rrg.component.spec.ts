import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TpaPageRrgComponent } from './tpa-page-rrg.component';

describe('TpaPageRrgComponent', () => {
  let component: TpaPageRrgComponent;
  let fixture: ComponentFixture<TpaPageRrgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TpaPageRrgComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TpaPageRrgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
