import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { NavIconName } from '../../../core/navigation/nav-items';

@Component({
  selector: 'app-nav-icon',
  templateUrl: './nav-icon.html',
  styleUrl: './nav-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavIcon {
  readonly name = input.required<NavIconName>();
  protected readonly src = computed(() => `icons/${this.name()}.svg`);
}
