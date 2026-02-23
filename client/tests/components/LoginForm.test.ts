import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoginForm from '../../src/components/auth/LoginForm.vue';

/* Mock vue-router */
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  RouterLink: {
    template: '<a><slot /></a>',
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render login form with email and password fields', () => {
    const wrapper = mount(LoginForm);

    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('should have correct placeholders', () => {
    const wrapper = mount(LoginForm);

    const emailInput = wrapper.find('input[type="email"]');
    const passwordInput = wrapper.find('input[type="password"]');

    expect(emailInput.attributes('placeholder')).toBe('you@example.com');
    expect(passwordInput.attributes('placeholder')).toBe('Enter your password');
  });

  it('should have required attributes on inputs', () => {
    const wrapper = mount(LoginForm);

    const emailInput = wrapper.find('input[type="email"]');
    const passwordInput = wrapper.find('input[type="password"]');

    expect(emailInput.attributes('required')).toBeDefined();
    expect(passwordInput.attributes('required')).toBeDefined();
  });

  it('should update v-model on input', async () => {
    const wrapper = mount(LoginForm);

    const emailInput = wrapper.find('input[type="email"]');
    const passwordInput = wrapper.find('input[type="password"]');

    await emailInput.setValue('test@example.com');
    await passwordInput.setValue('password123');

    expect((emailInput.element as HTMLInputElement).value).toBe('test@example.com');
    expect((passwordInput.element as HTMLInputElement).value).toBe('password123');
  });

  it('should contain a link to register page', () => {
    const wrapper = mount(LoginForm);
    expect(wrapper.text()).toContain("Don't have an account?");
    expect(wrapper.text()).toContain('Sign up');
  });

  it('should show "Sign In" button text', () => {
    const wrapper = mount(LoginForm);
    expect(wrapper.find('button[type="submit"]').text()).toBe('Sign In');
  });
});
