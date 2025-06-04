<template>
  <div class="dashboard-container">
    <header class="header">
      <h1 class="title">Dashboard</h1>
      <button 
        class="btn btn-primary" 
        data-testid="logout-btn"
        @click="logout"
      >
        Logout
      </button>
    </header>

    <nav class="sidebar">
      <ul class="nav-list">
        <li><a href="/dashboard" class="nav-link active">Dashboard</a></li>
        <li><a href="/profile" class="nav-link">Profile</a></li>
        <li><a href="/settings" class="nav-link">Settings</a></li>
        <!-- XPath locator examples -->
        <li><a href="/reports" class="nav-link" data-xpath="//a[contains(text(),'Reports')]">Reports</a></li>
        <li><a href="/analytics" class="nav-link" xpath="//nav//a[@href='/analytics']">Analytics</a></li>
      </ul>
    </nav>

    <main class="main-content" role="main">
      <section class="stats-section">
        <div class="stat-card" data-testid="user-count">
          <h3>Total Users</h3>
          <span class="stat-number">1,234</span>
        </div>
        <div class="stat-card" data-testid="order-count">
          <h3>Orders Today</h3>
          <span class="stat-number">56</span>
        </div>
        <!-- Complex XPath example -->
        <div class="stat-card" data-xpath="//div[@class='stat-card'][position()=3]">
          <h3>Revenue</h3>
          <span class="stat-number">$12,345</span>
        </div>
      </section>

      <section class="data-table-section">
        <h2>Recent Orders</h2>
        <table class="data-table" role="table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Amount</th>
              <!-- XPath for specific table header -->
              <th xpath="//table//th[contains(text(),'Actions')]">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr data-testid="order-row-1">
              <td>#12345</td>
              <td>John Doe</td>
              <td>
                <span class="status pending" aria-label="Pending status">Pending</span>
              </td>
              <td>$99.99</td>
              <td>
                <button class="btn btn-sm edit-btn" data-testid="edit-order-1">Edit</button>
                <!-- XPath for complex button selection -->
                <button class="btn btn-sm delete-btn" data-xpath="//tr[@data-testid='order-row-1']//button[contains(@class,'delete-btn')]">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="search-section">
        <input 
          type="text" 
          placeholder="Search orders..." 
          class="search-input"
          name="search"
          id="order-search"
        />
        <button class="btn search-btn" type="button">Search</button>
        <!-- XPath for finding search button by following sibling -->
        <button class="btn clear-btn" data-xpath="//input[@name='search']/following-sibling::button[2]" type="button">Clear</button>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const logout = () => {
  console.log('Logging out...');
};
</script>

<style scoped>
.dashboard-container {
  display: flex;
  min-height: 100vh;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
}

.sidebar {
  width: 250px;
  background: #f5f5f5;
  padding: 80px 0 20px 0;
}

.main-content {
  flex: 1;
  padding: 100px 20px 20px 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 10px;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status.pending {
  background: #fff3cd;
  color: #856404;
}
</style>
