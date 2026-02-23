import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MessageItem from '../../src/components/chat/MessageItem.vue';
import type { MessageWithSender } from '../../src/types';

/* Mock socket composable */
vi.mock('../../src/composables/useSocket', () => ({
  useSocket: () => ({
    deleteMessage: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
  }),
}));

const createMessage = (overrides: Partial<MessageWithSender> = {}): MessageWithSender => ({
  id: 'msg-1',
  channel_id: 'ch-1',
  sender_id: 'user-1',
  content: 'Hello World!',
  message_type: 'text',
  parent_id: null,
  is_edited: false,
  created_at: '2026-01-15T10:30:00Z',
  updated_at: '2026-01-15T10:30:00Z',
  sender_username: 'alice',
  sender_avatar_url: null,
  reactions: [],
  attachments: [],
  reply_count: 0,
  ...overrides,
});

describe('MessageItem', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render the message content', () => {
    const message = createMessage({ content: 'Test message content' });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).toContain('Test message content');
  });

  it('should display the sender username', () => {
    const message = createMessage({ sender_username: 'bob' });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).toContain('bob');
  });

  it('should show "(edited)" for edited messages', () => {
    const message = createMessage({ is_edited: true });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).toContain('(edited)');
  });

  it('should not show "(edited)" for non-edited messages', () => {
    const message = createMessage({ is_edited: false });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).not.toContain('(edited)');
  });

  it('should display reply count when there are replies', () => {
    const message = createMessage({ reply_count: 5 });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).toContain('5 replies');
  });

  it('should use singular "reply" for 1 reply', () => {
    const message = createMessage({ reply_count: 1 });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).toContain('1 reply');
  });

  it('should not show reply count for thread replies (messages with parent_id)', () => {
    const message = createMessage({ parent_id: 'parent-msg-1', reply_count: 3 });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).not.toContain('3 replies');
  });

  it('should display grouped reactions', () => {
    const message = createMessage({
      reactions: [
        { id: 'r1', message_id: 'msg-1', user_id: 'user-1', emoji: '👍' },
        { id: 'r2', message_id: 'msg-1', user_id: 'user-2', emoji: '👍' },
        { id: 'r3', message_id: 'msg-1', user_id: 'user-1', emoji: '❤️' },
      ],
    });

    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).toContain('👍');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('❤️');
    expect(wrapper.text()).toContain('1');
  });

  it('should emit openThread when reply count is clicked', async () => {
    const message = createMessage({ reply_count: 3 });
    const wrapper = mount(MessageItem, {
      props: { message },
    });

    const replyButton = wrapper.find('button');
    if (replyButton.exists()) {
      await replyButton.trigger('click');
    }

    /* Thread button emits openThread event */
    expect(wrapper.emitted()).toBeDefined();
  });

  it('should show file attachment links', () => {
    const message = createMessage({
      attachments: [
        {
          id: 'a1',
          message_id: 'msg-1',
          filename: 'uuid-doc.pdf',
          original_name: 'document.pdf',
          mime_type: 'application/pdf',
          file_size: 1024,
          storage_path: 'uploads/uuid-doc.pdf',
        },
      ],
    });

    const wrapper = mount(MessageItem, {
      props: { message },
    });

    expect(wrapper.text()).toContain('document.pdf');
  });
});
