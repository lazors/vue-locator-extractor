// TypeScript dynamic element generation examples for testing locator extraction

import { h, VNode } from 'vue';

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface ElementProps {
  id?: string;
  testId?: string;
  className?: string;
  disabled?: boolean;
}

// Example 1: TypeScript Vue h() function with proper typing
export function createTypedButton(userId: string, onClick: () => void): VNode {
  return h(
    'button',
    {
      'data-testid': `typed-button-${userId}`,
      class: 'btn btn-typed',
      type: 'button',
      onClick,
    },
    'TypeScript Button'
  );
}

// Example 2: Generic TypeScript h() function
export function createGenericElement<T extends Record<string, any>>(
  tag: keyof HTMLElementTagNameMap,
  props: T & { 'data-testid': string }
): VNode {
  return h(tag as string, {
    'data-testid': props['data-testid'],
    id: `generic-${props['data-testid']}`,
    ...props,
  });
}

// Example 3: TypeScript createElement with interfaces
export function createTypedTable(users: User[]): HTMLTableElement {
  const table = document.createElement('table');
  table.setAttribute('data-testid', 'typed-user-table');
  table.className = 'user-table';

  // Create header
  const header = document.createElement('thead');
  const headerRow = document.createElement('tr');

  ['Name', 'Email', 'Status', 'Actions'].forEach((text, index) => {
    const th = document.createElement('th');
    th.textContent = text;
    th.setAttribute('data-testid', `table-header-${index}`);
    headerRow.appendChild(th);
  });

  header.appendChild(headerRow);
  table.appendChild(header);

  // Create body
  const tbody = document.createElement('tbody');

  users.forEach((user: User) => {
    const row = document.createElement('tr');
    row.setAttribute('data-testid', `typed-user-row-${user.id}`);

    // Name cell
    const nameCell = document.createElement('td');
    nameCell.setAttribute('data-testid', `user-name-${user.id}`);
    nameCell.textContent = user.name;
    row.appendChild(nameCell);

    // Email cell
    const emailCell = document.createElement('td');
    emailCell.setAttribute('data-testid', `user-email-${user.id}`);
    emailCell.textContent = user.email;
    row.appendChild(emailCell);

    // Status cell
    const statusCell = document.createElement('td');
    statusCell.setAttribute('data-testid', `user-status-${user.id}`);
    statusCell.textContent = user.isActive ? 'Active' : 'Inactive';
    statusCell.className = user.isActive ? 'status-active' : 'status-inactive';
    row.appendChild(statusCell);

    // Actions cell
    const actionsCell = document.createElement('td');

    const editBtn = document.createElement('button');
    editBtn.setAttribute('data-testid', `edit-typed-user-${user.id}`);
    editBtn.className = 'btn btn-edit';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.setAttribute('data-testid', `delete-typed-user-${user.id}`);
    deleteBtn.className = 'btn btn-delete';
    deleteBtn.textContent = 'Delete';

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  return table;
}

// Example 4: TypeScript template strings with proper typing
export function generateTypedForm(
  formId: string,
  formType: 'create' | 'edit' = 'create'
): string {
  const submitText = formType === 'create' ? 'Create User' : 'Update User';

  return `
    <form id="typed-form-${formId}" data-testid="typed-form-${formType}" class="typed-form">
      <div class="form-section">
        <h3 data-testid="form-title-${formType}">${
    formType.charAt(0).toUpperCase() + formType.slice(1)
  } User</h3>
      </div>
      
      <div class="form-group">
        <label for="typed-name-${formId}">Full Name:</label>
        <input 
          type="text" 
          id="typed-name-${formId}" 
          name="name"
          data-testid="typed-name-input"
          placeholder="Enter full name"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="typed-email-${formId}">Email Address:</label>
        <input 
          type="email" 
          id="typed-email-${formId}" 
          name="email"
          data-testid="typed-email-input"
          placeholder="Enter email address"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="typed-role-${formId}">User Role:</label>
        <select 
          id="typed-role-${formId}" 
          name="role"
          data-testid="typed-role-select"
          required
        >
          <option value="">Select Role</option>
          <option value="admin" data-testid="role-option-admin">Administrator</option>
          <option value="user" data-testid="role-option-user">User</option>
          <option value="viewer" data-testid="role-option-viewer">Viewer</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="submit" data-testid="typed-submit-btn" class="btn btn-primary">
          ${submitText}
        </button>
        <button type="button" data-testid="typed-cancel-btn" class="btn btn-secondary">
          Cancel
        </button>
        <button type="reset" data-testid="typed-reset-btn" class="btn btn-outline">
          Reset Form
        </button>
      </div>
    </form>
  `;
}

// Example 5: TypeScript notification generator with strict typing
export function generateTypedNotification(
  notification: NotificationData
): string {
  const iconMap = {
    info: '🔵',
    warning: '🟡',
    error: '🔴',
    success: '🟢',
  };

  return `
    <div class="notification notification-${
      notification.type
    }" data-testid="typed-notification-${notification.id}">
      <div class="notification-header">
        <span class="notification-icon" data-testid="notification-icon-${
          notification.type
        }">
          ${iconMap[notification.type]}
        </span>
        <h4 class="notification-title" data-testid="typed-notification-title">
          ${notification.title}
        </h4>
        <button class="notification-close" data-testid="close-typed-notification-${
          notification.id
        }" aria-label="Close">
          ×
        </button>
      </div>
      <div class="notification-body">
        <p class="notification-message" data-testid="typed-notification-message">
          ${notification.message}
        </p>
      </div>
    </div>
  `;
}

// Example 6: TypeScript class-based component factory
export class TypedElementFactory {
  private static instanceId = 0;

  static createModal(modalId: string, title: string): VNode {
    return h(
      'div',
      {
        class: 'modal modal-overlay',
        'data-testid': `typed-modal-${modalId}`,
        role: 'dialog',
        'aria-labelledby': `modal-title-${modalId}`,
      },
      [
        h('div', { class: 'modal-content' }, [
          h('div', { class: 'modal-header' }, [
            h(
              'h2',
              {
                id: `modal-title-${modalId}`,
                'data-testid': 'typed-modal-title',
              },
              title
            ),
            h(
              'button',
              {
                'data-testid': 'typed-modal-close',
                class: 'modal-close',
                'aria-label': 'Close modal',
              },
              '×'
            ),
          ]),
          h(
            'div',
            {
              class: 'modal-body',
              'data-testid': 'typed-modal-body',
            },
            'Modal content goes here'
          ),
          h('div', { class: 'modal-footer' }, [
            h(
              'button',
              {
                'data-testid': 'typed-modal-cancel',
                class: 'btn btn-secondary',
              },
              'Cancel'
            ),
            h(
              'button',
              {
                'data-testid': 'typed-modal-confirm',
                class: 'btn btn-primary',
              },
              'Confirm'
            ),
          ]),
        ]),
      ]
    );
  }

  static createAlert(type: NotificationData['type'], message: string): VNode {
    const id = ++this.instanceId;

    return h(
      'div',
      {
        class: `alert alert-${type}`,
        'data-testid': `typed-alert-${type}-${id}`,
        role: 'alert',
      },
      [
        h(
          'span',
          {
            'data-testid': `typed-alert-message-${id}`,
          },
          message
        ),
        h(
          'button',
          {
            'data-testid': `typed-alert-dismiss-${id}`,
            class: 'alert-dismiss',
          },
          '×'
        ),
      ]
    );
  }
}

// Example 7: TypeScript async element generation
export async function createAsyncUserCard(
  userId: string
): Promise<HTMLDivElement> {
  const cardElement = document.createElement('div');
  cardElement.setAttribute('data-testid', `async-user-card-${userId}`);
  cardElement.className = 'user-card async-generated';

  // Simulate async data loading
  await new Promise((resolve) => setTimeout(resolve, 100));

  const avatar = document.createElement('img');
  avatar.setAttribute('data-testid', `async-user-avatar-${userId}`);
  avatar.src = `/api/users/${userId}/avatar`;
  avatar.alt = `User ${userId} avatar`;

  const name = document.createElement('h3');
  name.setAttribute('data-testid', `async-user-name-${userId}`);
  name.textContent = `User ${userId}`;

  const email = document.createElement('p');
  email.setAttribute('data-testid', `async-user-email-${userId}`);
  email.textContent = `user${userId}@example.com`;

  const actions = document.createElement('div');
  actions.className = 'user-actions';

  const viewBtn = document.createElement('button');
  viewBtn.setAttribute('data-testid', `async-view-user-${userId}`);
  viewBtn.className = 'btn btn-outline';
  viewBtn.textContent = 'View Profile';

  const editBtn = document.createElement('button');
  editBtn.setAttribute('data-testid', `async-edit-user-${userId}`);
  editBtn.className = 'btn btn-primary';
  editBtn.textContent = 'Edit User';

  actions.appendChild(viewBtn);
  actions.appendChild(editBtn);

  cardElement.appendChild(avatar);
  cardElement.appendChild(name);
  cardElement.appendChild(email);
  cardElement.appendChild(actions);

  return cardElement;
}

// Example 8: TypeScript with generics and complex patterns
export function createTypedDataGrid<T extends Record<string, any>>(
  data: T[],
  columns: Array<{ key: keyof T; label: string; testId?: string }>
): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'typed-data-grid');
  container.className = 'data-grid-container';

  const table = document.createElement('table');
  table.setAttribute('data-testid', 'typed-data-grid-table');
  table.className = 'data-grid-table';

  // Generate header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  columns.forEach((column, index) => {
    const th = document.createElement('th');
    th.setAttribute('data-testid', column.testId || `grid-header-${index}`);
    th.textContent = column.label;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Generate body
  const tbody = document.createElement('tbody');

  data.forEach((item, rowIndex) => {
    const row = document.createElement('tr');
    row.setAttribute('data-testid', `grid-row-${rowIndex}`);

    columns.forEach((column, colIndex) => {
      const td = document.createElement('td');
      td.setAttribute('data-testid', `grid-cell-${rowIndex}-${colIndex}`);
      td.textContent = String(item[column.key]);
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}

// Export types for external use
export type { User, NotificationData, ElementProps };
export { TypedElementFactory };
