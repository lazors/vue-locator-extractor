// Auto-generated Playwright Page Object Model classes
import { Page } from '@playwright/test';

export class dashboardPage {
  constructor(protected page: Page) {}

  // element with data-testid: "logout-btn"
  logoutBtn = this.page.getByTestId('logout-btn');

  // div with data-testid: "user-count"
  userCount = this.page.getByTestId('user-count');

  // div with data-testid: "order-count"
  orderCount = this.page.getByTestId('order-count');

  // tr with data-testid: "order-row-1"
  orderRow1 = this.page.getByTestId('order-row-1');

  // button with data-testid: "edit-order-1"
  editOrder1 = this.page.getByTestId('edit-order-1');

  // element with id: "logout-btn"
  logoutBtn1 = this.page.locator('#logout-btn');

  // div with id: "user-count"
  userCount1 = this.page.locator('#user-count');

  // div with id: "order-count"
  orderCount1 = this.page.locator('#order-count');

  // tr with id: "order-row-1"
  orderRow11 = this.page.locator('#order-row-1');

  // button with id: "edit-order-1"
  editOrder11 = this.page.locator('#edit-order-1');

  // element with id: "order-search"
  orderSearch = this.page.locator('#order-search');

  // div with class: "dashboard-container"
  classDashboardContainer = this.page.locator('.dashboard-container');

  // header with class: "header"
  classHeader = this.page.locator('.header');

  // h1 with class: "title"
  classTitle = this.page.locator('.title');

  // button with class: "btn btn-primary"
  classBtnBtnPrimary = this.page.locator('.btn.btn-primary');

  // nav with class: "sidebar"
  classSidebar = this.page.locator('.sidebar');

  // ul with class: "nav-list"
  classNavList = this.page.locator('.nav-list');

  // a with class: "nav-link active"
  classNavLinkActive = this.page.locator('.nav-link.active');

  // a with class: "nav-link"
  classNavLink = this.page.locator('.nav-link');

  // a with class: "nav-link"
  classNavLink1 = this.page.locator('.nav-link');

  // a with class: "nav-link"
  classNavLink2 = this.page.locator('.nav-link');

  // a with class: "nav-link"
  classNavLink3 = this.page.locator('.nav-link');

  // main with class: "main-content"
  classMainContent = this.page.locator('.main-content');

  // section with class: "stats-section"
  classStatsSection = this.page.locator('.stats-section');

  // div with class: "stat-card"
  classStatCard = this.page.locator('.stat-card');

  // span with class: "stat-number"
  classStatNumber = this.page.locator('.stat-number');

  // div with class: "stat-card"
  classStatCard1 = this.page.locator('.stat-card');

  // span with class: "stat-number"
  classStatNumber1 = this.page.locator('.stat-number');

  // div with class: "stat-card"
  classStatCard2 = this.page.locator('.stat-card');

  // span with class: "stat-number"
  classStatNumber2 = this.page.locator('.stat-number');

  // section with class: "data-table-section"
  classDataTableSection = this.page.locator('.data-table-section');

  // table with class: "data-table"
  classDataTable = this.page.locator('.data-table');

  // span with class: "status pending"
  classStatusPending = this.page.locator('.status.pending');

  // button with class: "btn btn-sm edit-btn"
  classBtnBtnSmEditBtn = this.page.locator('.btn.btn-sm.edit-btn');

  // button with class: "btn btn-sm delete-btn"
  classBtnBtnSmDeleteBtn = this.page.locator('.btn.btn-sm.delete-btn');

  // section with class: "search-section"
  classSearchSection = this.page.locator('.search-section');

  // element with class: "search-input"
  classSearchInput = this.page.locator('.search-input');

  // button with class: "btn search-btn"
  classBtnSearchBtn = this.page.locator('.btn.search-btn');

  // button with class: "btn clear-btn"
  classBtnClearBtn = this.page.locator('.btn.clear-btn');

  // element with name: "search"
  search = this.page.locator('[name="search"]');

  // input with placeholder: "Search orders..."
  searchOrdersInput = this.page.getByPlaceholder('Search orders...');

  // span with aria-label: "Pending status"
  pendingStatus = this.page.getByLabel('Pending status');

  // main with role: "main"
  mainRole = this.page.getByRole('main');

  // table with role: "table"
  tableRole = this.page.getByRole('table');

  // a with xpath: "//a[contains(text(),'Reports')]"
  xpathAContainsTextReports = this.page.locator('//a[contains(text(),\'Reports\')]');

  // div with xpath: "//div[@class='stat-card'][position()=3]"
  xpathDivClassStatCardPosition3 = this.page.locator('//div[@class=\'stat-card\'][position()=3]');

  // button with xpath: "//tr[@data-testid='order-row-1']//button[contains(@class,'delete-btn')]"
  xpathTrDataTestidOrderRow1ButtonContainsClassDeleteBtn = this.page.locator('//tr[@data-testid=\'order-row-1\']//button[contains(@class,\'delete-btn\')]');

  // button with xpath: "//input[@name='search']/following-sibling::button[2]"
  xpathInputNameSearchFollowingSiblingButton2 = this.page.locator('//input[@name=\'search\']/following-sibling::button[2]');

  // a with xpath: "//a[contains(text(),'Reports')]"
  xpathAContainsTextReports1 = this.page.locator('//a[contains(text(),\'Reports\')]');

  // a with xpath: "//nav//a[@href='/analytics']"
  xpathNavAHrefAnalytics = this.page.locator('//nav//a[@href=\'/analytics\']');

  // div with xpath: "//div[@class='stat-card'][position()=3]"
  xpathDivClassStatCardPosition31 = this.page.locator('//div[@class=\'stat-card\'][position()=3]');

  // th with xpath: "//table//th[contains(text(),'Actions')]"
  xpathTableThContainsTextActions = this.page.locator('//table//th[contains(text(),\'Actions\')]');

  // button with xpath: "//tr[@data-testid='order-row-1']//button[contains(@class,'delete-btn')]"
  xpathTrDataTestidOrderRow1ButtonContainsClassDeleteBtn1 = this.page.locator('//tr[@data-testid=\'order-row-1\']//button[contains(@class,\'delete-btn\')]');

  // button with xpath: "//input[@name='search']/following-sibling::button[2]"
  xpathInputNameSearchFollowingSiblingButton21 = this.page.locator('//input[@name=\'search\']/following-sibling::button[2]');
}
