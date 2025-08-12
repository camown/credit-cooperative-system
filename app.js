// Firebase SDK imports - These are at the top-level of the module.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, query, orderBy, where, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js"; // Corrected Firestore version to 9.16.0

// --- FIREBASE CONFIGURATION ---
// This configuration is outside any function, making it available throughout the module.
const firebaseConfig = {
    apiKey: "AIzaSyBI1T9X4HRY9KX97HAg2c5XZHhD6UxGKmw",
    authDomain: "credit-cooperative-system.firebaseapp.com",
    projectId: "credit-cooperative-system",
    storageBucket: "credit-cooperative-system.appspot.com",
    messagingSenderId: "928820368021",
    appId: "1:928820368021:web:8a33c4abf0cfa9ad86819c"
};

// Initialize Firebase services immediately when the module loads.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GLOBAL APP STATE AND CACHED DOM ELEMENTS ---
// Declare all variables globally, assign them inside DOMContentLoaded or initializeMainApplicationUI
let authView, appView, mainContent, loadingIndicator;

// Auth specific elements
let loginForm, registerForm, loginErrorDiv, registerErrorDiv;
let showRegisterLink, showLoginLink;
let loginEmailInput, loginPasswordInput;
let registerNameInput, registerEmailInput, registerPasswordInput;

// Main App specific elements (will be assigned within initializeMainApplicationUI)
let logoutBtn, navLinks, sections;
let membersTableBody, transactionsTableBody, savingsSummaryTableBody, loansTableBody;
let addMemberModal, memberDetailsModal, savingsModal, loanModal, loanPaymentModal, withdrawalModal, savingsLedgerModal, loanLedgerModal;
let addMemberForm, memberDetailsForm, savingsForm, loanForm, loanPaymentForm, withdrawalForm;
let newDepositBtn, newLoanBtn;
let editMemberBtn, saveMemberBtn, cancelEditMemberBtn, deleteMemberBtn;
let savingsMemberSelect, loanMemberSelect;
let generateWeeklyReportBtn, weeklyReportDateRange;
let startDateInput, endDateInput;
let transactionLimitSelect, transactionCountDisplay;

// Chart instances
let monthlyTrendsChartInstance, financialFlowChartInstance, assetLiabilityChartInstance;

// Data caches
let members = [];
let transactions = [];
let loans = [];
let currentMemberId = null;

// Flag to ensure main app UI is initialized only once
let isMainAppUIReady = false;

// --- UTILITY FUNCTIONS ---
function showModalAlert(message, isError = false) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'} z-50`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function generateMemberCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'MEM-';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// --- CORE APPLICATION LOGIC - RUNS ONCE DOM IS FULLY LOADED ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired. Caching initial DOM elements (auth view)...");
    authView = document.getElementById('auth-view');
    appView = document.getElementById('app-view');
    mainContent = document.getElementById('main-content');
    loadingIndicator = document.getElementById('loading-indicator');

    // Authentication form elements
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    loginErrorDiv = document.getElementById('login-error');
    registerErrorDiv = document.getElementById('register-error');
    showRegisterLink = document.getElementById('show-register-link');
    showLoginLink = document.getElementById('show-login-link');
    loginEmailInput = document.getElementById('login-email');
    loginPasswordInput = document.getElementById('login-password');
    registerNameInput = document.getElementById('register-name');
    registerEmailInput = document.getElementById('register-email');
    registerPasswordInput = document.getElementById('register-password');

    console.log("Attaching auth form listeners...");
    attachAuthFormListeners();

    console.log("Setting up onAuthStateChanged listener...");
    // Set up the Firebase Auth state observer
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("onAuthStateChanged: User logged in.", user);
            if (authView) authView.classList.add('hidden');
            if (appView) appView.classList.remove('hidden');
            const userDisplayName = document.getElementById('user-display-name');
            if (userDisplayName) userDisplayName.textContent = user.displayName || user.email;

            if (!isMainAppUIReady) {
                console.log("Initializing main application UI for the first time...");
                await initializeMainApplicationUI();
                isMainAppUIReady = true;
                console.log("Main application UI initialized.");
            } else {
                console.log("Main application UI already initialized. Skipping re-initialization.");
            }
        } else {
            console.log("onAuthStateChanged: User logged out or no user.");
            if (authView) authView.classList.remove('hidden');
            if (appView) appView.classList.add('hidden');
            if (mainContent) mainContent.classList.add('hidden');
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            isMainAppUIReady = false;
        }
    });
});

// --- AUTHENTICATION FORM LISTENERS ---
function attachAuthFormListeners() {
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (loginErrorDiv) loginErrorDiv.classList.add('hidden');
            try {
                const email = loginEmailInput ? loginEmailInput.value : '';
                const password = loginPasswordInput ? loginPasswordInput.value : '';
                console.log("Attempting login with email:", email);
                await signInWithEmailAndPassword(auth, email, password);
                console.log("Login successful (handled by onAuthStateChanged).");
            } catch (error) {
                console.error("Login error:", error);
                if (loginErrorDiv) {
                    loginErrorDiv.textContent = error.message;
                    loginErrorDiv.classList.remove('hidden');
                }
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (registerErrorDiv) registerErrorDiv.classList.add('hidden');
            try {
                const name = registerNameInput ? registerNameInput.value : '';
                const email = registerEmailInput ? registerEmailInput.value : '';
                const password = registerPasswordInput ? registerPasswordInput.value : '';

                if (password.length < 6) {
                    throw new Error("Password must be at least 6 characters.");
                }
                console.log("Attempting registration with email:", email);
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });

                // FIXED: Sign out immediately after registration. This forces the user to log in again,
                // ensuring the onAuthStateChanged listener gets the fresh profile with the displayName.
                await signOut(auth);

                showModalAlert('Registration successful! Please log in with your new account.');
                if (registerForm) registerForm.classList.add('hidden');
                if (loginForm) loginForm.classList.remove('hidden');
                if (loginForm) loginForm.reset();
                if (registerForm) registerForm.reset();
                if (loginErrorDiv) loginErrorDiv.classList.add('hidden');
                if (registerErrorDiv) registerErrorDiv.classList.add('hidden');
            } catch (error) {
                console.error("Registration error:", error);
                if (registerErrorDiv) {
                    registerErrorDiv.textContent = error.message;
                    registerErrorDiv.classList.remove('hidden');
                }
            }
        });
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Showing register form.");
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
            if (loginErrorDiv) loginErrorDiv.classList.add('hidden');
            if (registerForm) registerForm.reset();
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Showing login form.");
            if (registerForm) registerForm.classList.add('hidden');
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerErrorDiv) registerErrorDiv.classList.add('hidden');
            if (loginForm) loginForm.reset();
        });
    }
}

// --- MAIN APPLICATION UI INITIALIZATION (CALLED ONCE AFTER SUCCESSFUL LOGIN) ---
async function initializeMainApplicationUI() {
    console.log("initializeMainApplicationUI: Caching main application UI elements...");
    // Crucially, all element assignments MUST happen here, before any function calls
    // that might rely on them.
    logoutBtn = document.getElementById('logout-btn');
    navLinks = document.querySelectorAll('.nav-link');
    sections = document.querySelectorAll('main section');

    membersTableBody = document.getElementById('members-table-body');
    transactionsTableBody = document.getElementById('transactions-table-body');
    savingsSummaryTableBody = document.getElementById('savings-summary-table-body');
    loansTableBody = document.getElementById('loans-table-body');

    addMemberModal = document.getElementById('add-member-modal');
    memberDetailsModal = document.getElementById('member-details-modal');
    savingsModal = document.getElementById('savings-modal');
    loanModal = document.getElementById('loan-modal');
    loanPaymentModal = document.getElementById('loan-payment-modal');
    withdrawalModal = document.getElementById('withdrawal-modal');
    savingsLedgerModal = document.getElementById('savings-ledger-modal');
    loanLedgerModal = document.getElementById('loan-ledger-modal');

    addMemberForm = document.getElementById('add-member-form');
    memberDetailsForm = document.getElementById('member-details-form');
    savingsForm = document.getElementById('savings-form');
    loanForm = document.getElementById('loan-form');
    loanPaymentForm = document.getElementById('loan-payment-form');
    withdrawalForm = document.getElementById('withdrawal-form');

    newDepositBtn = document.getElementById('new-deposit-btn');
    newLoanBtn = document.getElementById('new-loan-btn');

    editMemberBtn = document.getElementById('edit-member-btn');
    saveMemberBtn = document.getElementById('save-member-btn');
    cancelEditMemberBtn = document.getElementById('cancel-edit-member-btn');
    deleteMemberBtn = document.getElementById('delete-member-btn');

    savingsMemberSelect = document.getElementById('savings-member-select');
    loanMemberSelect = document.getElementById('loan-member-select');

    generateWeeklyReportBtn = document.getElementById('generate-weekly-report-btn');
    weeklyReportDateRange = document.getElementById('weekly-report-date-range');
    startDateInput = document.getElementById('report-start-date');
    endDateInput = document.getElementById('report-end-date');
    transactionLimitSelect = document.getElementById('transaction-limit');
    transactionCountDisplay = document.getElementById('transaction-count-display');

    console.log("initializeMainApplicationUI: Caching complete. Attaching main app listeners...");
    attachMainAppListeners(); // Call after ALL main app elements are cached.
    console.log("initializeMainApplicationUI: Showing dashboard section...");
    showSection('dashboard');
    console.log("initializeMainApplicationUI: Calling fetchDataAndRender...");
    await fetchDataAndRender(); // Await to ensure data is there before rendering
    console.log("initializeMainApplicationUI: fetchDataAndRender completed.");
}

// --- NAVIGATION LOGIC ---
function showSection(id) {
    const targetSection = document.getElementById(id);
    if (!sections || !targetSection || !navLinks) {
        console.error("Navigation elements or target section not found for ID:", id);
        return;
    }

    sections.forEach(section => {
        section.classList.add('hidden');
    });
    targetSection.classList.remove('hidden');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
        }
    });
}

// --- DATA FETCHING & RENDERING ---
async function fetchDataAndRender() {
    console.log("fetchDataAndRender: Starting data fetch.");
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    if (mainContent) mainContent.classList.add('hidden');
    try {
        console.log("Fetching members...");
        const membersSnapshot = await getDocs(query(collection(db, "members"), orderBy("name")));
        members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Members fetched:", members.length);

        console.log("Fetching transactions...");
        const transactionsSnapshot = await getDocs(query(collection(db, "transactions"), orderBy("date", "desc")));
        transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Transactions fetched:", transactions.length);

        console.log("Fetching loans...");
        const loansSnapshot = await getDocs(query(collection(db, "loans"), orderBy("issue_date", "desc")));
        loans = loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Loans fetched:", loans.length);

        console.log("Calling renderAll()...");
        renderAll();
        console.log("Calling populateMemberSelects()...");
        populateMemberSelects();
        console.log("Data fetch and render process completed successfully.");
    } catch (error) {
        console.error("fetchDataAndRender ERROR:", error);
        if (error.code === 'permission-denied') {
            showModalAlert("Access denied to Firestore data. Please check your Firebase Security Rules.", true);
        } else if (error.code === 'unavailable') {
            showModalAlert("Firebase is currently unavailable. Please check your internet connection or try again later.", true);
        } else {
            showModalAlert("Failed to load data from database: " + error.message, true);
        }
    } finally {
        console.log("fetchDataAndRender: Hiding loader and showing content.");
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        if (mainContent) mainContent.classList.remove('hidden');
    }
}

function renderAll() {
    console.log("renderAll: Rendering all components.");
    renderMetricCards();
    renderMembersTable(members);
    renderRecentActivity();
    // Render transactions with current search/limit settings
    const currentSearchInput = document.getElementById('transaction-search');
    const currentSearchTerm = currentSearchInput ? currentSearchInput.value : '';
    const currentLimit = transactionLimitSelect ? transactionLimitSelect.value : '10'; // Default to '10'
    renderTransactionsTable(transactions, currentSearchTerm, currentLimit);
    renderSavingsSummaryTable();
    renderLoansTable();
    renderOverallFinancialSummary();

    // Set default dates for report filters on load
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    if (startDateInput && endDateInput) {
        if (!startDateInput.value) startDateInput.value = sevenDaysAgo.toISOString().split('T')[0];
        if (!endDateInput.value) endDateInput.value = today.toISOString().split('T')[0];
    }

    // Render weekly report with default dates
    renderWeeklyFinancialReport(
        startDateInput ? startDateInput.value : null,
        endDateInput ? endDateInput.value : null
    );
    renderCharts();
    console.log("renderAll: All components rendered.");
}

function populateMemberSelects() {
    if (savingsMemberSelect) {
        savingsMemberSelect.innerHTML = '<option value="">-- Select Member --</option>';
        members.forEach(member => {
            const option = `<option value="${member.id}">${member.name} (${member.member_code || member.id.substring(0,8)})</option>`;
            savingsMemberSelect.innerHTML += option;
        });
    }
    if (loanMemberSelect) {
        loanMemberSelect.innerHTML = '<option value="">-- Select Member --</option>';
        members.forEach(member => {
            const option = `<option value="${member.id}">${member.name} (${member.member_code || member.id.substring(0,8)})</option>`;
            loanMemberSelect.innerHTML += option;
        });
    }
}

function renderMembersTable(memberList) {
    if (!membersTableBody) { console.warn("membersTableBody not found."); return; }
    membersTableBody.innerHTML = memberList.map(m => {
        return `
                <tr class="hover:bg-gray-50">
                    <td class="p-3 font-mono text-base">${m.member_code || m.id}</td>
                    <td class="p-3 font-semibold text-base">${m.name}</td>
                    <td class="p-3 text-base">${m.contact_no}</td>
                    <td class="p-3 text-base"><span class="px-2 py-1 text-xs rounded-full ${m.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${m.status}</span></td>
                    <td class="p-3 text-center space-x-2">
                        <button data-member-id="${m.id}" class="view-details-btn bg-blue-500 text-white px-3 py-2 text-base rounded-lg hover:bg-blue-600">View Details</button>
                        <button data-member-id="${m.id}" class="check-savings-btn bg-green-500 text-white px-3 py-2 text-base rounded-lg hover:bg-green-600">Check Savings</button>
                        <button data-member-id="${m.id}" class="check-loans-btn bg-yellow-500 text-white px-3 py-2 text-base rounded-lg hover:bg-yellow-600">Check Loans</button>
                    </td>
                </tr>
            `;
    }).join('') || `<tr><td colspan="5" class="text-center p-4 text-base">No members found.</td></tr>`;
    attachDynamicActionListeners();
}

function renderTransactionsTable(allTransactions, filterTerm = '', limit = '10') {
    if (!transactionsTableBody) { console.warn("transactionsTableBody not found."); return; }

    const filteredTransactions = allTransactions.filter(t => {
        const member = members.find(m => m.id === t.member_id);
        const memberName = member ? member.name.toLowerCase() : '';
        const memberCode = member ? member.member_code?.toLowerCase() : '';
        const transactionType = t.type.toLowerCase();
        const remarks = t.remarks.toLowerCase();

        return transactionType.includes(filterTerm) ||
               memberName.includes(filterTerm) ||
               remarks.includes(filterTerm) ||
               memberCode.includes(filterTerm);
    });

    const sortedTransactions = filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const limitedTransactions = (limit === 'all') ? sortedTransactions : sortedTransactions.slice(0, parseInt(limit));

    const typeClasses = { 'Deposit': 'text-green-600', 'Withdrawal': 'text-red-600', 'Loan Issued': 'text-orange-600', 'Loan Payment': 'text-blue-600' };
    transactionsTableBody.innerHTML = limitedTransactions.map(t => {
        const member = members.find(m => m.id === t.member_id);
        return `<tr class="hover:bg-gray-50"><td class="p-3 text-base">${t.date}</td><td class="p-3 font-semibold text-base">${member ? member.name : 'Unknown'}</td><td class="p-3 font-bold text-base ${typeClasses[t.type] || ''}">${t.type}</td><td class="p-3 text-right text-base">₱${Math.abs(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td><td class="p-3 text-gray-600 text-base">${t.remarks}</td></tr>`
    }).join('') || `<tr><td colspan="5" class="text-center p-4 text-base">No transactions found.</td></tr>`;

    if (transactionCountDisplay) {
        transactionCountDisplay.textContent = `Showing ${limitedTransactions.length} of ${filteredTransactions.length} results`;
    }
}

function renderSavingsSummaryTable() {
    if (!savingsSummaryTableBody) { console.warn("savingsSummaryTableBody not found."); return; }
    const memberSavingsMap = new Map();

    transactions.forEach(t => {
        if (t.type === 'Deposit' || t.type === 'Withdrawal') {
            const amount = parseFloat(t.amount) || 0;
            const currentSavings = memberSavingsMap.get(t.member_id) || 0;
            memberSavingsMap.set(t.member_id, currentSavings + amount);
        }
    });

    savingsSummaryTableBody.innerHTML = '';
    if (memberSavingsMap.size === 0) {
        savingsSummaryTableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-base">No savings records found.</td></tr>`;
        return;
    }

    Array.from(memberSavingsMap.keys()).sort((a,b) => {
        const nameA = members.find(m => m.id === a)?.name || '';
        const nameB = members.find(m => m.id === b)?.name || '';
        return nameA.localeCompare(nameB);
    }).forEach(memberId => {
        const totalSavings = memberSavingsMap.get(memberId);
        const member = members.find(m => m.id === memberId);
        if (member) {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                        <td class="p-3 font-semibold text-base">${member.name} (${member.member_code})</td>
                        <td class="p-3 text-right text-base">₱${totalSavings.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td class="p-3 text-center space-x-2">
                            <button data-member-id="${member.id}" data-current-savings="${totalSavings}" class="deposit-btn bg-green-500 text-white px-4 py-2 text-base rounded-lg hover:bg-green-600">Deposit</button>
                            <button data-member-id="${member.id}" data-current-savings="${totalSavings}" class="withdraw-btn bg-red-500 text-white px-4 py-2 text-base rounded-lg hover:bg-red-600">Withdraw</button>
                            <button data-member-id="${member.id}" class="view-savings-ledger-btn bg-blue-500 text-white px-4 py-2 text-base rounded-lg hover:bg-blue-600">View Ledger</button>
                        </td>
                    `;
            savingsSummaryTableBody.appendChild(row);
        }
    });
    attachDynamicActionListeners();
}

function renderLoansTable() {
    if (!loansTableBody) { console.warn("loansTableBody not found."); return; }
    loansTableBody.innerHTML = loans.map(loan => {
        const member = members.find(m => m.id === loan.member_id);
        const statusClass = loan.status === 'active' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800';
        const loanAmount = parseFloat(loan.loan_amount) || 0;
        const loanBalance = parseFloat(loan.balance) || 0;

        return `
                    <tr class="hover:bg-gray-50">
                        <td class="p-3 font-semibold text-base">${member ? member.name : 'Unknown'} (${member ? member.member_code : ''})</td>
                        <td class="p-3 text-right text-base">₱${loanAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td class="p-3 text-right text-base">₱${loanBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td class="p-3 text-base"><span class="px-2 py-1 text-xs rounded-full ${statusClass}">${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span></td>
                        <td class="p-3 text-base">${loan.issue_date}</td>
                        <td class="p-3 text-center">
                            ${loan.status === 'active' ? `<button data-loan-id="${loan.id}" data-member-id="${loan.member_id}" data-loan-amount="${loanAmount}" data-balance="${loanBalance}" class="pay-loan-btn bg-blue-500 text-white px-4 py-2 text-base rounded-lg hover:bg-blue-600">Pay</button>` : ''}
                            <button data-loan-id="${loan.id}" data-member-id="${loan.member_id}" data-loan-amount="${loanAmount}" data-balance="${loanBalance}" class="view-loan-ledger-btn bg-purple-500 text-white px-4 py-2 text-base rounded-lg hover:bg-purple-600">View Payments</button>
                        </td>
                    </tr>
                `;
    }).join('') || `<tr><td colspan="6" class="text-center p-4 text-base">No loan records found.</td></tr>`;
    attachDynamicActionListeners();
}

function renderMetricCards() {
    const totalMembers = members.length;
    // CORRECTED: Calculate total savings by summing positive deposits and negative withdrawals
    const totalSavings = transactions
        .filter(t => ['Deposit', 'Withdrawal'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

    const totalLoansIssued = transactions.filter(t => t.type === 'Loan Issued').reduce((sum, t) => sum + t.amount, 0);
    const activeLoans = loans.filter(loan => loan.status === 'active');
    const totalOutstandingLoans = activeLoans.reduce((sum, loan) => (parseFloat(loan.balance) || 0) + sum, 0);

    const metrics = [
        {
            title: 'Total Members',
            value: totalMembers,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`,
            color: 'blue'
        },
        {
            title: 'Total Savings',
            value: `₱${totalSavings.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>`,
            color: 'green'
        },
        {
            title: 'Total Loans Issued',
            value: `₱${totalLoansIssued.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>`,
            color: 'red'
        },
        {
            title: 'Outstanding Loans',
            value: `₱${totalOutstandingLoans.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
            icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>`,
            color: 'yellow'
        }
    ];

    const metricsContainer = document.getElementById('metrics-container');
    if (metricsContainer) {
        metricsContainer.innerHTML = metrics.map(metric => `
            <div class="bg-white p-6 rounded-xl shadow-lg border-l-4 border-${metric.color}-500 flex items-center space-x-4 transition-transform transform hover:-translate-y-1">
                <div class="bg-${metric.color}-100 p-3 rounded-full">
                    ${metric.icon}
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">${metric.title}</h3>
                    <p class="text-3xl font-bold text-gray-800">${metric.value}</p>
                </div>
            </div>
        `).join('');
    }
}

function renderRecentActivity() {
    const feedContainer = document.getElementById('recent-activity-feed');
    if (!feedContainer) { console.warn("recent-activity-feed container not found."); return; }

    const recentTransactions = transactions.slice(0, 5); // Already sorted by date desc

    const icons = {
        'Deposit': '➕',
        'Withdrawal': '➖',
        'Loan Issued': '💸',
        'Loan Payment': '📬'
    };

    feedContainer.innerHTML = recentTransactions.map(t => {
        const member = members.find(m => m.id === t.member_id);
        const memberName = member ? member.name : 'Unknown Member';
        const amount = Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
        const icon = icons[t.type] || '❓';

        return `
            <li class="flex items-center space-x-3">
                <span class="text-2xl">${icon}</span>
                <div>
                    <p class="text-base font-medium text-gray-800">${t.type} by ${memberName}</p>
                    <p class="text-sm text-gray-500">₱${amount} on ${t.date}</p>
                </div>
            </li>
        `;
    }).join('') || `<li class="text-center text-gray-500">No recent activity.</li>`;
}


function renderOverallFinancialSummary() {
    const totalDeposits = transactions.filter(t => t.type === 'Deposit').reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'Withdrawal').reduce((sum, t) => sum + t.amount, 0);
    const totalLoansIssuedAmount = transactions.filter(t => t.type === 'Loan Issued').reduce((sum, t) => sum + t.amount, 0);
    const totalLoanPayments = transactions.filter(t => t.type === 'Loan Payment').reduce((sum, t) => sum + t.amount, 0);
    const serviceChargeFromLoans = transactions.filter(t => t.remarks === 'Capital Build-Up from Loan Service Charge').reduce((sum, t) => sum + t.amount, 0);

    const cashOnHand = totalDeposits + totalWithdrawals; // Withdrawals are negative
    const loansReceivable = loans.filter(loan => loan.status === 'active').reduce((sum, loan) => (parseFloat(loan.balance) || 0) + sum, 0);
    const totalAssets = cashOnHand + loansReceivable;

    const memberSavingsLiability = cashOnHand;
    const initialDepositsAsEquity = transactions.filter(t => t.remarks === 'Initial Deposit for Membership').reduce((sum, t) => sum + t.amount, 0);
    const equityFromServiceCharges = serviceChargeFromLoans;
    const netIncome = (serviceChargeFromLoans + totalLoanPayments) - totalLoansIssuedAmount;
    const cooperativeEquity = initialDepositsAsEquity + equityFromServiceCharges + netIncome;

    const financialMetricsContainer = document.getElementById('financial-metrics-container');
    if (financialMetricsContainer) {
        financialMetricsContainer.innerHTML = `
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <h3>Total Assets</h3>
                    <p class="text-3xl font-bold text-purple-600">₱${totalAssets.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <h3>Total Liabilities (Member Savings)</h3>
                    <p class="text-3xl font-bold text-orange-600">₱${memberSavingsLiability.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg">
                    <h3>Cooperative Equity</h3>
                    <p class="text-3xl font-bold text-indigo-600">₱${cooperativeEquity.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                </div>
            `;
    }

    const incomeStatementBody = document.getElementById('income-statement-body');
    if (incomeStatementBody) {
        incomeStatementBody.innerHTML = `
                <tr><td class="p-3 text-base">Revenue (Service Charges)</td><td class="p-3 text-right text-base">₱${serviceChargeFromLoans.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr><td class="p-3 text-base">Loan Payments Received</td><td class="p-3 text-right text-base">₱${totalLoanPayments.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr><td class="p-3 font-semibold text-base">Total Income</td><td class="p-3 text-right font-semibold text-base">₱${(serviceChargeFromLoans + totalLoanPayments).toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr><td class="p-3 text-base">Loans Disbursed</td><td class="p-3 text-right text-base">₱${totalLoansIssuedAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr class="font-bold"><td class="p-3 text-base">Net Income / (Loss)</td><td class="p-3 text-right text-base">₱${netIncome.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
            `;
    }

    const balanceSheetBody = document.getElementById('balance-sheet-body');
    if (balanceSheetBody) {
        balanceSheetBody.innerHTML = `
                <tr><td colspan="2" class="p-3 font-bold bg-gray-50 text-base">ASSETS</td></tr>
                <tr><td class="p-3 text-base">Cash on Hand (Net Savings)</td><td class="p-3 text-right text-base">₱${cashOnHand.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr><td class="p-3 text-base">Loans Receivable (Outstanding Loans)</td><td class="p-3 text-right text-base">₱${loansReceivable.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr class="font-bold"><td class="p-3 text-base">Total Assets</td><td class="p-3 text-right text-base">₱${totalAssets.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr><td colspan="2" class="p-3 font-bold bg-gray-50 text-base">LIABILITIES</td></tr>
                <tr><td class="p-3 text-base">Member Savings (Liability)</td><td class="p-3 text-right text-base">₱${memberSavingsLiability.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr class="font-bold"><td class="p-3 text-base">Total Liabilities</td><td class="p-3 text-right text-base">₱${memberSavingsLiability.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr><td colspan="2" class="p-3 font-bold bg-gray-50 text-base">EQUITY</td></tr>
                <tr><td class="p-3 text-base">Cooperative Capital</td><td class="p-3 text-right text-base">₱${cooperativeEquity.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                <tr class="font-bold"><td class="p-3 text-base">Total Equity</td><td class="p-3 text-right text-base">₱${cooperativeEquity.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
            `;
    }
}

// Adjusted to accept start and end dates
function renderWeeklyFinancialReport(startDate = null, endDate = null) {
    let reportStartDate, reportEndDate;

    // Set default values for the date inputs if they are not already set
    if (startDateInput && endDateInput) { // Check if elements exist
        if (!startDateInput.value && !endDateInput.value) {
            reportEndDate = new Date(); // Current date
            reportStartDate = new Date(reportEndDate);
            reportStartDate.setDate(reportEndDate.getDate() - 7); // Default to last 7 days

            startDateInput.value = reportStartDate.toISOString().split('T')[0];
            endDateInput.value = reportEndDate.toISOString().split('T')[0];
        } else {
            // Use existing values if they are set
            reportStartDate = new Date(startDateInput.value);
            reportEndDate = new Date(endDateInput.value);
        }
    } else {
        // Fallback if date inputs are not found (should not happen with correct HTML)
        reportEndDate = new Date();
        reportStartDate = new Date(reportEndDate);
        reportStartDate.setDate(reportEndDate.getDate() - 7);
    }


    // Normalize dates to start/end of day for comparison
    reportStartDate.setHours(0, 0, 0, 0);
    reportEndDate.setHours(23, 59, 59, 999); // Include entire end day

    if (weeklyReportDateRange) {
        weeklyReportDateRange.textContent = `Report for: ${reportStartDate.toISOString().split('T')[0]} to ${reportEndDate.toISOString().split('T')[0]}`;
    }

    let newMembersThisWeek = 0;
    let weeklyDeposits = 0;
    let weeklyWithdrawals = 0;
    let weeklyLoansIssued = 0;
    let weeklyLoanPayments = 0;

    members.forEach(member => {
        let memberJoinDate = null;
        if (member.created_at) {
            memberJoinDate = new Date(member.created_at);
        } else {
            const initialDeposit = transactions.find(t => t.member_id === member.id && t.remarks === 'Initial Deposit for Membership');
            if (initialDeposit) {
                memberJoinDate = new Date(initialDeposit.date);
            }
        }
        if (memberJoinDate) {
            memberJoinDate.setHours(0, 0, 0, 0);
            if (memberJoinDate >= reportStartDate && memberJoinDate <= reportEndDate) {
                newMembersThisWeek++;
            }
        }
    });

    transactions.forEach(t => {
        const transactionDate = new Date(t.date);
        transactionDate.setHours(0, 0, 0, 0);
        if (transactionDate >= reportStartDate && transactionDate <= reportEndDate) {
            const amount = parseFloat(t.amount) || 0;
            if (t.type === 'Deposit') {
                weeklyDeposits += amount;
            } else if (t.type === 'Withdrawal') {
                weeklyWithdrawals += Math.abs(amount);
            } else if (t.type === 'Loan Issued') {
                weeklyLoansIssued += amount;
            } else if (t.type === 'Loan Payment') {
                weeklyLoanPayments += amount;
            }
        }
    });

    const weeklyReportBody = document.getElementById('weekly-report-body');
    if (weeklyReportBody) {
        weeklyReportBody.innerHTML = `
                    <tr><td class="p-3 font-semibold text-base">New Members This Week</td><td class="p-3 text-right text-base">${newMembersThisWeek}</td></tr>
                    <tr><td class="p-3 font-semibold text-base">Weekly Deposits</td><td class="p-3 text-right text-base">₱${weeklyDeposits.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td class="p-3 font-semibold text-base">Weekly Withdrawals</td><td class="p-3 text-right text-base">₱${weeklyWithdrawals.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td class="p-3 font-semibold text-base">Weekly Loans Issued</td><td class="p-3 text-right text-base">₱${weeklyLoansIssued.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td class="p-3 font-semibold text-base">Weekly Loan Payments</td><td class="p-3 text-right text-base">₱${weeklyLoanPayments.toLocaleString('en-US', {minimumFractionDigits: 2})}</td></tr>
                `;
    }
}

function renderCharts() {
    // Destroy existing chart instances to prevent duplicates
    if (monthlyTrendsChartInstance) monthlyTrendsChartInstance.destroy();
    if (financialFlowChartInstance) financialFlowChartInstance.destroy();
    if (assetLiabilityChartInstance) assetLiabilityChartInstance.destroy();

    // NEW: Monthly Inflow vs Outflow Bar Chart
    const monthlyFlowData = {};
    transactions.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyFlowData[month]) {
            monthlyFlowData[month] = { inflow: 0, outflow: 0 };
        }
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'Deposit' || t.type === 'Loan Payment') {
            monthlyFlowData[month].inflow += amount;
        } else if (t.type === 'Withdrawal' || t.type === 'Loan Issued') {
            monthlyFlowData[month].outflow += Math.abs(amount);
        }
    });

    const sortedFlowMonths = Object.keys(monthlyFlowData).sort();
    const monthlyInflow = sortedFlowMonths.map(month => monthlyFlowData[month].inflow);
    const monthlyOutflow = sortedFlowMonths.map(month => monthlyFlowData[month].outflow);

    const monthlyTrendsChartCanvas = document.getElementById('monthlyTrendsChart');
    if (monthlyTrendsChartCanvas) {
        monthlyTrendsChartInstance = new Chart(monthlyTrendsChartCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedFlowMonths,
                datasets: [
                    {
                        label: 'Total Inflow (Deposits + Payments)',
                        data: monthlyInflow,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Total Outflow (Withdrawals + Loans)',
                        data: monthlyOutflow,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Cash Flow (Inflow vs. Outflow)',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // Financial Flow Chart
    const financialFlowData = {};
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!financialFlowData[month]) {
            financialFlowData[month] = { deposits: 0, loanPayments: 0, withdrawals: 0 };
        }
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'Deposit') {
            financialFlowData[month].deposits += amount;
        } else if (t.type === 'Loan Payment') {
            financialFlowData[month].loanPayments += amount;
        } else if (t.type === 'Withdrawal') {
            financialFlowData[month].withdrawals += Math.abs(amount);
        }
    });

    const sortedFinancialMonths = Object.keys(financialFlowData).sort();
    const depositsFlow = sortedFinancialMonths.map(month => financialFlowData[month].deposits);
    const loanPaymentsFlow = sortedFinancialMonths.map(month => financialFlowData[month].loanPayments);
    const withdrawalsFlow = sortedFinancialMonths.map(month => financialFlowData[month].withdrawals);

    const financialFlowChartCanvas = document.getElementById('financialFlowChart');
    if (financialFlowChartCanvas) {
        financialFlowChartInstance = new Chart(financialFlowChartCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedFinancialMonths,
                datasets: [
                    { label: 'Deposits', data: depositsFlow, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                    { label: 'Loan Payments', data: loanPaymentsFlow, backgroundColor: 'rgba(153, 102, 255, 0.6)' },
                    { label: 'Withdrawals', data: withdrawalsFlow, backgroundColor: 'rgba(255, 159, 64, 0.6)' }
                ]
            },
            options: { responsive : true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Monthly Financial Flow' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
        });
    }

    // Asset vs. Liability Chart
    const totalDepositsForChart = transactions.filter(t => t.type === 'Deposit').reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawalsForChart = transactions.filter(t => t.type === 'Withdrawal').reduce((sum, t) => sum + t.amount, 0);
    const cashOnHandForChart = totalDepositsForChart + totalWithdrawalsForChart; // Withdrawals are negative
    const loansReceivableForChart = loans.filter(loan => loan.status === 'active').reduce((sum, loan) => (parseFloat(loan.balance) || 0) + sum, 0);

    const memberSavingsLiabilityForChart = cashOnHandForChart;
    const initialDepositsAsEquityForChart = transactions.filter(t => t.remarks === 'Initial Deposit for Membership').reduce((sum, t) => sum + t.amount, 0);
    const serviceChargeFromLoansForChart = transactions.filter(t => t.remarks === 'Capital Build-Up from Loan Service Charge').reduce((sum, t) => sum + t.amount, 0);
    const totalLoanPaymentsForChart = transactions.filter(t => t.type === 'Loan Payment').reduce((sum, t) => sum + t.amount, 0);
    const totalLoansIssuedAmountForChart = transactions.filter(t => t.type === 'Loan Issued').reduce((sum, t) => sum + t.amount, 0);
    const netIncomeForChart = (serviceChargeFromLoansForChart + totalLoanPaymentsForChart) - totalLoansIssuedAmountForChart;
    const cooperativeEquityForChart = initialDepositsAsEquityForChart + serviceChargeFromLoansForChart + netIncomeForChart;

    const assetLiabilityChartCanvas = document.getElementById('assetLiabilityChart');
    if (assetLiabilityChartCanvas) {
        assetLiabilityChartInstance = new Chart(assetLiabilityChartCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Cash (Asset)', 'Loans Receivable (Asset)', 'Member Savings (Liability)', 'Cooperative Equity'],
                datasets: [{
                    data: [cashOnHandForChart, loansReceivableForChart, memberSavingsLiabilityForChart, cooperativeEquityForChart],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#007bff']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Assets vs. Liabilities & Equity' } } }
        });
    }
}

// --- MAIN APP RELATED LISTENERS (Attached once main UI is initialized) ---
function attachMainAppListeners() {
    // Navigation links
    if (navLinks) {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.getAttribute('href').substring(1);
                showSection(sectionId);
            });
        });
    }

    // Logout button
    if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

    // Add Member button
    const addMemberBtn = document.getElementById('add-member-btn'); // Re-get directly here, it's safer
    if (addMemberBtn) addMemberBtn.addEventListener('click', () => {
        if (addMemberForm) addMemberForm.reset();
        const memberFormError = document.getElementById('member-form-error');
        if (memberFormError) memberFormError.classList.add('hidden');
        if (addMemberModal) addMemberModal.classList.add('is-open');
    });

    // Close modal buttons (general)
    document.querySelectorAll('.close-modal-btn, .cancel-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.remove('is-open');
    }));

    // New Deposit button
    if (newDepositBtn) newDepositBtn.addEventListener('click', () => {
        if (savingsForm) savingsForm.reset();
        const savingsFormError = document.getElementById('savings-form-error');
        if (savingsFormError) savingsFormError.classList.add('hidden');
        populateMemberSelects();
        if (savingsMemberSelect) savingsMemberSelect.value = '';
        if (savingsModal) savingsModal.classList.add('is-open');
    });

    // New Loan button
    if (newLoanBtn) newLoanBtn.addEventListener('click', () => {
        if (loanForm) loanForm.reset();
        const loanFormError = document.getElementById('loan-form-error');
        if (loanFormError) loanFormError.classList.add('hidden');
        populateMemberSelects();
        if (loanMemberSelect) loanMemberSelect.value = '';
        if (loanModal) loanModal.classList.add('is-open');
    });

    // Savings member select change
    if (savingsMemberSelect) savingsMemberSelect.addEventListener('change', (e) => {
        const selectedMemberId = e.target.value;
        const hiddenMemberIdInput = document.querySelector('#savings-form input[name="member_id"]');
        if (hiddenMemberIdInput) hiddenMemberIdInput.value = selectedMemberId;
    });

    // Loan member select change
    if (loanMemberSelect) loanMemberSelect.addEventListener('change', (e) => {
        const selectedMemberId = e.target.value;
        const hiddenMemberIdInput = document.querySelector('#loan-form input[name="member_id"]');
        if (hiddenMemberIdInput) hiddenMemberIdInput.value = selectedMemberId;
    });

    // Edit/Delete Member Buttons in details modal
    if (editMemberBtn) editMemberBtn.addEventListener('click', () => {
        setMemberDetailsFormReadonly(false);
        document.getElementById('member-details-title').textContent = 'Edit Member Details';
    });

    if (cancelEditMemberBtn) cancelEditMemberBtn.addEventListener('click', () => {
        setMemberDetailsFormReadonly(true);
        document.getElementById('member-details-title').textContent = 'Member Details';
        const member = members.find(m => m.id === currentMemberId);
        if (member) {
            populateMemberDetailsModal(member);
        }
    });

    if (deleteMemberBtn) deleteMemberBtn.addEventListener('click', async () => {
        const confirmation = window.confirm('Are you sure you want to delete this member? This action cannot be undone and will NOT delete associated transactions or loans directly. These will become orphaned.');
        if (confirmation) {
            try {
                await deleteDoc(doc(db, "members", currentMemberId));
                showModalAlert('Member deleted successfully!', false);
                if (memberDetailsModal) memberDetailsModal.classList.remove('is-open');
                fetchDataAndRender();
            } catch (error) {
                console.error("Error deleting member:", error);
                showModalAlert(`Error deleting member: ${error.message}`, true);
            }
        }
    });

    // Member Details Form submission
    if (memberDetailsForm) memberDetailsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(memberDetailsForm);
        const updatedMemberData = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('member-details-error');
        try {
            delete updatedMemberData.member_code; // Ensure member code is not accidentally updated
            const memberRef = doc(db, "members", currentMemberId);
            await updateDoc(memberRef, updatedMemberData);
            showModalAlert('Member details updated successfully!', false);
            if (memberDetailsModal) memberDetailsModal.classList.remove('is-open');
            setMemberDetailsFormReadonly(true);
            document.getElementById('member-details-title').textContent = 'Member Details';
            fetchDataAndRender();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message || "An unexpected error occurred during member update.";
                errorDiv.classList.remove('hidden');
            }
        }
    });

    // Add Member Form submission
    if (addMemberForm) addMemberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addMemberForm);
        const newMemberData = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('member-form-error');
        try {
            const age = new Date().getFullYear() - new Date(newMemberData.dob).getFullYear();
            if (age < 18) throw new Error("Member must be at least 18 years old.");

            let newMemberCode;
            let isUnique = false;
            let retries = 0;
            while (!isUnique && retries < 5) { // Try up to 5 times for a unique code
                newMemberCode = generateMemberCode();
                const existingMembersWithCode = await getDocs(query(collection(db, "members"), where("member_code", "==", newMemberCode)));
                if (existingMembersWithCode.empty) {
                    isUnique = true;
                }
                retries++;
            }
            if (!isUnique) {
                throw new Error("Failed to generate a unique member code after several attempts. Please try again.");
            }

            const docRef = await addDoc(collection(db, "members"), { ...newMemberData, member_code: newMemberCode, age: age, status: "Active" });
            await addDoc(collection(db, "transactions"), {
                member_id: docRef.id,
                type: 'Deposit',
                amount: 500,
                date: new Date().toISOString().split('T')[0],
                remarks: 'Initial Deposit for Membership'
            });
            showModalAlert('Member added successfully!');
            if (addMemberModal) addMemberModal.classList.remove('is-open');
            fetchDataAndRender();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message || "An unexpected error occurred during member registration.";
                errorDiv.classList.remove('hidden');
            }
        }
    });

    // Savings Form submission
    if (savingsForm) savingsForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const formData = new FormData(savingsForm);
        const data = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('savings-form-error');
        try {
            if (!data.member_id) {
                throw new Error("Please select a member.");
            }
            if (isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
                throw new Error("Please enter a valid deposit amount.");
            }

            await addDoc(collection(db, "transactions"), { member_id: data.member_id, type: 'Deposit', amount: parseFloat(data.amount), date: new Date().toISOString().split('T')[0], remarks: 'Member Deposit' });
            showModalAlert('Deposit successful!');
            if (savingsModal) savingsModal.classList.remove('is-open');
            fetchDataAndRender();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message || "An unexpected error occurred during deposit.";
                errorDiv.classList.remove('hidden');
            }
        }
    });

    // Withdrawal Form submission
    if (withdrawalForm) withdrawalForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const formData = new FormData(withdrawalForm);
        const data = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('withdrawal-form-error');
        try {
            const memberId = data.member_id;
            const withdrawalAmount = parseFloat(data.amount);

            if (!memberId) {
                throw new Error("Member ID is missing.");
            }
            if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
                throw new Error("Please enter a valid withdrawal amount.");
            }

            const currentMemberSavings = transactions.filter(t => t.member_id === memberId && (t.type === 'Deposit' || t.type === 'Withdrawal')).reduce((sum, t) => sum + t.amount, 0);

            if (withdrawalAmount > currentMemberSavings) {
                throw new Error(`Insufficient funds. Current savings: ₱${currentMemberSavings.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
            }

            await addDoc(collection(db, "transactions"), {
                member_id: memberId,
                type: 'Withdrawal',
                amount: -withdrawalAmount, // Store as negative for withdrawals
                date: new Date().toISOString().split('T')[0],
                remarks: 'Member Withdrawal'
            });
            showModalAlert('Withdrawal successful!');
            if (withdrawalModal) withdrawalModal.classList.remove('is-open');
            fetchDataAndRender();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message || "An unexpected error occurred during withdrawal.";
                errorDiv.classList.remove('hidden');
            }
        }
    });

    // Loan Form submission
    if (loanForm) loanForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const formData = new FormData(loanForm);
        const data = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('loan-form-error');
        try {
            const memberId = data.member_id;
            const loanAmount = parseFloat(data.loan_amount);

            if (!memberId) {
                throw new Error("Please select a member.");
            }
            if (isNaN(loanAmount) || loanAmount <= 0) {
                throw new Error("Please enter a valid loan amount.");
            }
            if (isNaN(parseInt(data.duration)) || parseInt(data.duration) <= 0) {
                throw new Error("Please enter a valid loan duration.");
            }

            const memberSavings = transactions.filter(t => t.member_id === memberId && (t.type === 'Deposit' || t.type === 'Withdrawal')).reduce((sum, t) => sum + t.amount, 0);
            let maxLoan = (memberSavings >= 2000) ? Math.min(50000, memberSavings * 2) : 0;
            if (loanAmount > maxLoan) throw new Error(`Loan denied. Max loan is ₱${maxLoan.toLocaleString('en-US', {minimumFractionDigits: 2})}.`);

            const serviceCharge = loanAmount * 0.03;
            const netLoanDisbursement = loanAmount - serviceCharge;

            const loanDocRef = await addDoc(collection(db, "loans"), {
                member_id: memberId,
                loan_amount: loanAmount,
                duration: parseInt(data.duration),
                interest_rate: 0.03, // Assuming a fixed interest rate
                issue_date: new Date().toISOString().split('T')[0],
                status: 'active',
                balance: loanAmount, // Initial balance is the full loan amount
                payments_made: 0
            });

            await addDoc(collection(db, "transactions"), {
                member_id: memberId,
                type: 'Loan Issued',
                amount: netLoanDisbursement,
                date: new Date().toISOString().split('T')[0],
                remarks: `Loan issued (net of 3% service charge of ₱${serviceCharge.toLocaleString('en-US', {minimumFractionDigits: 2})})`
            });

            await addDoc(collection(db, "transactions"), {
                member_id: memberId,
                type: 'Deposit',
                amount: serviceCharge,
                date: new Date().toISOString().split('T')[0],
                remarks: 'Capital Build-Up from Loan Service Charge'
            });

            showModalAlert('Loan approved and disbursed!');
            if (loanModal) loanModal.classList.remove('is-open');
            fetchDataAndRender();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message || "An unexpected error occurred during loan application.";
                errorDiv.classList.remove('hidden');
            }
        }
    });

    // Loan Payment Form submission
    if (loanPaymentForm) loanPaymentForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const formData = new FormData(loanPaymentForm);
        const data = Object.fromEntries(formData.entries());
        const errorDiv = document.getElementById('loan-payment-form-error');
        try {
            const loanId = data.loan_id;
            const memberId = data.member_id;
            const paymentAmount = parseFloat(data.payment_amount);

            const loanRef = doc(db, "loans", loanId);
            const currentLoan = loans.find(l => l.id === loanId);

            if (!currentLoan) {
                throw new Error("Loan record not found.");
            }
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                throw new Error("Please enter a valid payment amount.");
            }

            if (paymentAmount > currentLoan.balance) {
                throw new Error(`Payment amount must be less than or equal to the outstanding balance (₱${currentLoan.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}).`);
            }

            const newBalance = currentLoan.balance - paymentAmount;
            const newPaymentsMade = (parseFloat(currentLoan.payments_made) || 0) + paymentAmount;
            let newStatus = currentLoan.status;

            if (newBalance <= 0) {
                newStatus = 'completed';
            }

            await updateDoc(loanRef, {
                balance: newBalance,
                payments_made: newPaymentsMade,
                status: newStatus
            });

            await addDoc(collection(db, "transactions"), {
                member_id: memberId,
                type: 'Loan Payment',
                amount: paymentAmount,
                date: new Date().toISOString().split('T')[0],
                remarks: `Loan payment for loan ID: ${loanId.substring(0,8)}...`
            });

            showModalAlert('Loan payment recorded successfully!');
            if (loanPaymentModal) loanPaymentModal.classList.remove('is-open');
            fetchDataAndRender();
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message || "An unexpected error occurred during loan payment.";
                errorDiv.classList.remove('hidden');
            }
        }
    });

    // Search input listeners
    const memberSearchInput = document.getElementById('member-search');
    if (memberSearchInput) memberSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredMembers = members.filter(member =>
            member.name.toLowerCase().includes(searchTerm) ||
            (member.member_code && member.member_code.toLowerCase().includes(searchTerm))
        );
        renderMembersTable(filteredMembers);
    });

    const transactionSearchInput = document.getElementById('transaction-search');
    // Add event listener for transaction search input
    if (transactionSearchInput) {
        transactionSearchInput.addEventListener('input', () => {
            const searchTerm = transactionSearchInput.value.toLowerCase();
            const currentLimit = transactionLimitSelect ? transactionLimitSelect.value : '10';
            renderTransactionsTable(transactions, searchTerm, currentLimit);
        });
    }

    const transactionLimit = document.getElementById('transaction-limit');
    // Add event listener for transaction limit select
    if (transactionLimit) {
        transactionLimit.addEventListener('change', () => {
            const searchTerm = transactionSearchInput ? transactionSearchInput.value.toLowerCase() : '';
            const currentLimit = transactionLimit.value;
            renderTransactionsTable(transactions, searchTerm, currentLimit);
        });
    }


    const savingsSearchInput = document.getElementById('savings-search');
    if (savingsSearchInput) savingsSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredMemberIds = new Set();
        members.forEach(m => {
            if (m.name.toLowerCase().includes(searchTerm) || (m.member_code && m.member_code.toLowerCase().includes(searchTerm))) {
                filteredMemberIds.add(m.id);
            }
        });

        const filteredSavingsMap = new Map();
        transactions.forEach(t => {
            if (filteredMemberIds.has(t.member_id) && (t.type === 'Deposit' || t.type === 'Withdrawal')) {
                const currentSavings = filteredSavingsMap.get(t.member_id) || 0;
                const amount = parseFloat(t.amount) || 0;
                filteredSavingsMap.set(t.member_id, currentSavings + amount);
            }
        });

        if (savingsSummaryTableBody) {
            savingsSummaryTableBody.innerHTML = '';
            if (filteredSavingsMap.size === 0 && searchTerm !== '') {
                savingsSummaryTableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-base">No matching savings records found.</td></tr>`;
            } else if (filteredSavingsMap.size === 0 && searchTerm === '') {
                savingsSummaryTableBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-base">No savings records found.</td></tr>`;
            } else {
                Array.from(filteredSavingsMap.keys()).sort((a,b) => {
                    const nameA = members.find(m => m.id === a)?.name || '';
                    const nameB = members.find(m => m.id === b)?.name || '';
                    return nameA.localeCompare(nameB);
                }).forEach(memberId => {
                    const totalSavings = filteredSavingsMap.get(memberId);
                    const member = members.find(m => m.id === memberId);
                    if (member) {
                        const row = document.createElement('tr');
                        row.className = 'hover:bg-gray-50';
                        row.innerHTML = `
                                    <td class="p-3 font-semibold text-base">${member.name} (${member.member_code})</td>
                                    <td class="p-3 text-right text-base">₱${totalSavings.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td class="p-3 text-center space-x-2">
                                        <button data-member-id="${member.id}" data-current-savings="${totalSavings}" class="deposit-btn bg-green-500 text-white px-4 py-2 text-base rounded-lg hover:bg-green-600">Deposit</button>
                                        <button data-member-id="${member.id}" data-current-savings="${totalSavings}" class="withdraw-btn bg-red-500 text-white px-4 py-2 text-base rounded-lg hover:bg-red-600">Withdraw</button>
                                        <button data-member-id="${member.id}" class="view-savings-ledger-btn bg-blue-500 text-white px-4 py-2 text-base rounded-lg hover:bg-blue-600">View Ledger</button>
                                    </td>
                                `;
                        savingsSummaryTableBody.appendChild(row);
                    }
                });
            }
        }
        attachDynamicActionListeners();
    });

    const loanSearchInput = document.getElementById('loan-search');
    if (loanSearchInput) loanSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredLoans = loans.filter(loan => {
            const member = members.find(m => m.id === loan.member_id);
            const memberName = member ? member.name.toLowerCase() : '';
            const memberCode = member ? member.member_code?.toLowerCase() : '';
            return memberName.includes(searchTerm) || loan.status.toLowerCase().includes(searchTerm) || memberCode.includes(searchTerm);
        });

        if (loansTableBody) {
            loansTableBody.innerHTML = filteredLoans.map(loan => {
                const member = members.find(m => m.id === loan.member_id);
                const statusClass = loan.status === 'active' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800';
                const loanAmount = parseFloat(loan.loan_amount) || 0;
                const loanBalance = parseFloat(loan.balance) || 0;

                return `
                            <tr class="hover:bg-gray-50">
                                <td class="p-3 font-semibold text-base">${member ? member.name : 'Unknown'} (${member ? member.member_code : ''})</td>
                                <td class="p-3 text-right text-base">₱${loanAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-3 text-right text-base">₱${loanBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                <td class="p-3 text-base"><span class="px-2 py-1 text-xs rounded-full ${statusClass}">${loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span></td>
                                <td class="p-3 text-base">${loan.issue_date}</td>
                                <td class="p-3 text-center">
                                    ${loan.status === 'active' ? `<button data-loan-id="${loan.id}" data-member-id="${loan.member_id}" data-loan-amount="${loanAmount}" data-balance="${loanBalance}" class="pay-loan-btn bg-blue-500 text-white px-4 py-2 text-base rounded-lg hover:bg-blue-600">Pay</button>` : ''}
                                    <button data-loan-id="${loan.id}" data-member-id="${loan.member_id}" data-loan-amount="${loanAmount}" data-balance="${loanBalance}" class="view-loan-ledger-btn bg-purple-500 text-white px-4 py-2 text-base rounded-lg hover:bg-purple-600">View Payments</button>
                                </td>
                            </tr>
                        `;
            }).join('') || `<tr><td colspan="6" class="text-center p-4 text-base">No matching loan records found.</td></tr>`;
        }
        attachDynamicActionListeners();
    });

    // Generate Weekly Report Button (now also with date inputs)
    if (generateWeeklyReportBtn) {
        generateWeeklyReportBtn.addEventListener('click', () => {
            const startDate = startDateInput ? startDateInput.value : null;
            const endDate = endDateInput ? endDateInput.value : null;
            if (!startDate || !endDate) {
                showModalAlert("Please select both a start and end date for the report.", true);
                return;
            }
            if (new Date(startDate) > new Date(endDate)) {
                showModalAlert("Start date cannot be after end date.", true);
                return;
            }
            renderWeeklyFinancialReport(startDate, endDate);
            showModalAlert('Weekly Report generated successfully!', false);
        });
    }
}

// Function to attach listeners to dynamically created elements (e.g., buttons inside tables)
// This must be called whenever dynamic content is updated
function attachDynamicActionListeners() {
    // These listeners are added using a common pattern.
    // .removeEventListener before .addEventListener prevents duplicate listeners
    // if the function is called multiple times on the same live DOM elements.

    document.querySelectorAll('.view-details-btn').forEach(btn => {
        // Ensure only one listener
        btn.removeEventListener('click', handleViewDetailsClick);
        btn.addEventListener('click', handleViewDetailsClick);
    });

    document.querySelectorAll('.check-savings-btn').forEach(btn => {
        btn.removeEventListener('click', handleCheckSavingsClick);
        btn.addEventListener('click', handleCheckSavingsClick);
    });

    document.querySelectorAll('.check-loans-btn').forEach(btn => {
        btn.removeEventListener('click', handleCheckLoansClick);
        btn.addEventListener('click', handleCheckLoansClick);
    });

    document.querySelectorAll('.deposit-btn').forEach(btn => {
        btn.removeEventListener('click', handleDepositClick);
        btn.addEventListener('click', handleDepositClick);
    });

    document.querySelectorAll('.withdraw-btn').forEach(btn => {
        btn.removeEventListener('click', handleWithdrawClick);
        btn.addEventListener('click', handleWithdrawClick);
    });

    document.querySelectorAll('.loan-btn').forEach(btn => {
        btn.removeEventListener('click', handleLoanClick);
        btn.addEventListener('click', handleLoanClick);
    });

    document.querySelectorAll('.pay-loan-btn').forEach(btn => {
        btn.removeEventListener('click', handlePayLoanClick);
        btn.addEventListener('click', handlePayLoanClick);
    });

    document.querySelectorAll('.view-savings-ledger-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewSavingsLedgerClick);
        btn.addEventListener('click', handleViewSavingsLedgerClick);
    });

    document.querySelectorAll('.view-loan-ledger-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewLoanLedgerClick);
        btn.addEventListener('click', handleViewLoanLedgerClick);
    });
}

// Handler functions for dynamic buttons
function handleViewDetailsClick(e) {
    const member = members.find(m => m.id === e.target.dataset.memberId);
    if (member) {
        currentMemberId = member.id;
        populateMemberDetailsModal(member);
    }
}

function handleCheckSavingsClick(e) {
    const member = members.find(m => m.id === e.target.dataset.memberId);
    if (member) {
        showSection('savings-tab');
        const savingsSearch = document.getElementById('savings-search');
        if (savingsSearch) {
            savingsSearch.value = member.name;
            savingsSearch.dispatchEvent(new Event('input')); // Trigger search to filter table
        }
    }
}

function handleCheckLoansClick(e) {
    const member = members.find(m => m.id === e.target.dataset.memberId);
    if (member) {
        showSection('loans-tab');
        const loanSearch = document.getElementById('loan-search');
        if (loanSearch) {
            loanSearch.value = member.name;
            loanSearch.dispatchEvent(new Event('input')); // Trigger search to filter table
        }
    }
}

function handleDepositClick(e) {
    const member = members.find(m => m.id === e.target.dataset.memberId);
    if(member){
        if (savingsForm) savingsForm.reset();
        const savingsFormError = document.getElementById('savings-form-error');
        if (savingsFormError) savingsFormError.classList.add('hidden');

        if (savingsMemberSelect) {
            savingsMemberSelect.innerHTML = `<option value="${member.id}">${member.name} (${member.member_code || member.id.substring(0,8)})</option>`;
            savingsMemberSelect.value = member.id;
        }
        const hiddenMemberIdInput = document.querySelector('#savings-form input[name="member_id"]');
        if (hiddenMemberIdInput) hiddenMemberIdInput.value = member.id;

        if (savingsModal) savingsModal.classList.add('is-open');
    }
}

function handleWithdrawClick(e) {
    const member = members.find(m => m.id === e.target.dataset.memberId);
    const currentSavings = parseFloat(e.target.dataset.currentSavings);
    if(member){
        if (withdrawalForm) withdrawalForm.reset();
        const withdrawalFormError = document.getElementById('withdrawal-form-error');
        if (withdrawalFormError) withdrawalFormError.classList.add('hidden');

        const hiddenMemberIdInput = document.querySelector('#withdrawal-form input[name="member_id"]');
        if (hiddenMemberIdInput) hiddenMemberIdInput.value = member.id;

        const withdrawalMemberName = document.getElementById('withdrawal-member-name');
        if (withdrawalMemberName) withdrawalMemberName.textContent = member.name;

        const withdrawalCurrentSavings = document.getElementById('withdrawal-current-savings');
        if (withdrawalCurrentSavings) withdrawalCurrentSavings.textContent = `₱${currentSavings.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        if (withdrawalModal) withdrawalModal.classList.add('is-open');
    }
}

function handleLoanClick(e) {
    const member = members.find(m => m.id === e.target.dataset.memberId);
    if(member){
        if (loanForm) loanForm.reset();
        const loanFormError = document.getElementById('loan-form-error');
        if (loanFormError) loanFormError.classList.add('hidden');

        if (loanMemberSelect) {
            loanMemberSelect.innerHTML = `<option value="${member.id}">${member.name} (${member.member_code || member.id.substring(0,8)})</option>`;
            loanMemberSelect.value = member.id;
        }
        const hiddenMemberIdInput = document.querySelector('#loan-form input[name="member_id"]');
        if (hiddenMemberIdInput) hiddenMemberIdInput.value = member.id;

        if (loanModal) loanModal.classList.add('is-open');
    }
}

function handlePayLoanClick(e) {
    const loanId = e.target.dataset.loanId;
    const memberId = e.target.dataset.memberId;
    const loanAmount = parseFloat(e.target.dataset.loanAmount);
    const currentBalance = parseFloat(e.target.dataset.balance);
    const member = members.find(m => m.id === memberId);

    if (member) {
        if (loanPaymentForm) loanPaymentForm.reset();
        const loanPaymentFormError = document.getElementById('loan-payment-form-error');
        if (loanPaymentFormError) loanPaymentFormError.classList.add('hidden');

        const loanIdInput = document.querySelector('#loan-payment-form input[name="loan_id"]');
        if (loanIdInput) loanIdInput.value = loanId;

        const memberIdInput = document.querySelector('#loan-payment-form input[name="member_id"]');
        if (memberIdInput) memberIdInput.value = memberId;

        const loanPaymentMemberName = document.getElementById('loan-payment-member-name');
        if (loanPaymentMemberName) loanPaymentMemberName.textContent = member.name;

        const loanPaymentLoanAmount = document.getElementById('loan-payment-loan-amount');
        if (loanPaymentLoanAmount) loanPaymentLoanAmount.textContent = `₱${loanAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        const loanPaymentCurrentBalance = document.getElementById('loan-payment-current-balance');
        if (loanPaymentCurrentBalance) loanPaymentCurrentBalance.textContent = `₱${currentBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        const paymentAmountInput = document.querySelector('#loan-payment-form input[name="payment_amount"]');
        if (paymentAmountInput) paymentAmountInput.max = currentBalance;

        if (loanPaymentModal) loanPaymentModal.classList.add('is-open');
    }
}

function handleViewSavingsLedgerClick(e) {
    populateSavingsLedgerModal(e.target.dataset.memberId);
}

function handleViewLoanLedgerClick(e) {
    populateLoanLedgerModal(e.target.dataset.loanId, e.target.dataset.memberId);
}

// Helper to set readonly/disabled state of member details form
function setMemberDetailsFormReadonly(isReadonly) {
    if (!memberDetailsForm) return;
    const inputs = memberDetailsForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.name === 'member_code') {
            input.readOnly = true;
            input.disabled = true;
        } else {
            input.readOnly = isReadonly;
            input.disabled = isReadonly;
        }
    });

    if (editMemberBtn) editMemberBtn.classList.toggle('hidden', !isReadonly);
    if (saveMemberBtn) saveMemberBtn.classList.toggle('hidden', isReadonly);
    if (cancelEditMemberBtn) cancelEditMemberBtn.classList.toggle('hidden', isReadonly);
    if (deleteMemberBtn) deleteMemberBtn.classList.toggle('hidden', !isReadonly);
}

function populateMemberDetailsModal(member) {
    if (!memberDetailsForm || !memberDetailsModal) return;

    const memberIdInput = document.querySelector('#member-details-form input[name="member_id"]');
    if (memberIdInput) memberIdInput.value = member.id;

    // Set values for all form fields, with null checks for each input
    if (memberDetailsForm.querySelector('[name="member_code"]')) memberDetailsForm.querySelector('[name="member_code"]').value = member.member_code || 'N/A';
    if (memberDetailsForm.querySelector('[name="name"]')) memberDetailsForm.querySelector('[name="name"]').value = member.name;
    if (memberDetailsForm.querySelector('[name="contact_no"]')) memberDetailsForm.querySelector('[name="contact_no"]').value = member.contact_no;
    if (memberDetailsForm.querySelector('[name="address"]')) memberDetailsForm.querySelector('[name="address"]').value = member.address;
    if (memberDetailsForm.querySelector('[name="dob"]')) memberDetailsForm.querySelector('[name="dob"]').value = member.dob;
    if (memberDetailsForm.querySelector('[name="pob"]')) memberDetailsForm.querySelector('[name="pob"]').value = member.pob;
    if (memberDetailsForm.querySelector('[name="citizenship"]')) memberDetailsForm.querySelector('[name="citizenship"]').value = member.citizenship;
    if (memberDetailsForm.querySelector('[name="sex"]')) memberDetailsForm.querySelector('[name="sex"]').value = member.sex;
    if (memberDetailsForm.querySelector('[name="civil_status"]')) memberDetailsForm.querySelector('[name="civil_status"]').value = member.civil_status;
    if (memberDetailsForm.querySelector('[name="fb_account"]')) memberDetailsForm.querySelector('[name="fb_account"]').value = member.fb_account;
    if (memberDetailsForm.querySelector('[name="spouse_name"]')) memberDetailsForm.querySelector('[name="spouse_name"]').value = member.spouse_name;
    if (memberDetailsForm.querySelector('[name="spouse_occupation"]')) memberDetailsForm.querySelector('[name="spouse_occupation"]').value = member.spouse_occupation;
    if (memberDetailsForm.querySelector('[name="father_name"]')) memberDetailsForm.querySelector('[name="father_name"]').value = member.father_name;
    if (memberDetailsForm.querySelector('[name="father_occupation"]')) memberDetailsForm.querySelector('[name="father_occupation"]').value = member.father_occupation;
    if (memberDetailsForm.querySelector('[name="mother_name"]')) memberDetailsForm.querySelector('[name="mother_name"]').value = member.mother_name;
    if (memberDetailsForm.querySelector('[name="mother_occupation"]')) memberDetailsForm.querySelector('[name="mother_occupation"]').value = member.mother_occupation;
    if (memberDetailsForm.querySelector('[name="elementary"]')) memberDetailsForm.querySelector('[name="elementary"]').value = member.elementary;
    if (memberDetailsForm.querySelector('[name="secondary"]')) memberDetailsForm.querySelector('[name="secondary"]').value = member.secondary;
    if (memberDetailsForm.querySelector('[name="junior_high"]')) memberDetailsForm.querySelector('[name="junior_high"]').value = member.junior_high;
    if (memberDetailsForm.querySelector('[name="senior_high"]')) memberDetailsForm.querySelector('[name="senior_high"]').value = member.senior_high;
    if (memberDetailsForm.querySelector('[name="college"]')) memberDetailsForm.querySelector('[name="college"]').value = member.college;

    setMemberDetailsFormReadonly(true); // Always start in read-only mode
    const memberDetailsTitle = document.getElementById('member-details-title');
    if (memberDetailsTitle) memberDetailsTitle.textContent = 'Member Details';
    const memberDetailsError = document.getElementById('member-details-error');
    if (memberDetailsError) memberDetailsError.classList.add('hidden');
    memberDetailsModal.classList.add('is-open');
}

function populateSavingsLedgerModal(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member || !savingsLedgerModal) { showModalAlert('Member or modal not found.', true); return; }

    const ledgerMemberName = document.getElementById('ledger-member-name');
    if (ledgerMemberName) ledgerMemberName.textContent = `${member.name} (${member.member_code || member.id.substring(0,8)})`;

    const ledgerBody = document.getElementById('savings-ledger-table-body');
    if (!ledgerBody) return;
    ledgerBody.innerHTML = '';

    const memberTransactions = transactions.filter(t => t.member_id === memberId && (t.type === 'Deposit' || t.type === 'Withdrawal'));

    if (memberTransactions.length === 0) {
        ledgerBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">No savings transactions found for this member.</td></tr>`;
        savingsLedgerModal.classList.add('is-open');
        return;
    }

    memberTransactions.forEach(t => {
        const typeClass = t.type === 'Deposit' ? 'text-green-600' : 'text-red-600';
        ledgerBody.innerHTML += `
                    <tr>
                        <td class="p-3">${t.date}</td>
                        <td class="p-3 font-bold ${typeClass}">${t.type}</td>
                        <td class="p-3 text-right">₱${Math.abs(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td class="p-3 text-gray-600">${t.remarks}</td>
                    </tr>
                `;
    });
    savingsLedgerModal.classList.add('is-open');
}

function populateLoanLedgerModal(loanId, memberId) {
    const loan = loans.find(l => l.id === loanId);
    const member = members.find(m => m.id === memberId);
    if (!loan || !member || !loanLedgerModal) { showModalAlert('Loan, Member, or modal not found.', true); return; }

    const loanLedgerMemberName = document.getElementById('loan-ledger-member-name');
    const loanLedgerLoanAmount = document.getElementById('loan-ledger-loan-amount');
    const loanLedgerCurrentBalance = document.getElementById('loan-ledger-current-balance');

    if (loanLedgerMemberName) loanLedgerMemberName.textContent = `${member.name} (${member.member_code || member.id.substring(0,8)})`;
    if (loanLedgerLoanAmount) loanLedgerLoanAmount.textContent = `₱${(parseFloat(loan.loan_amount) || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if (loanLedgerCurrentBalance) loanLedgerCurrentBalance.textContent = `₱${(parseFloat(loan.balance) || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    const ledgerBody = document.getElementById('loan-ledger-table-body');
    if (!ledgerBody) return;
    ledgerBody.innerHTML = '';

    const loanTransactions = transactions.filter(t =>
        t.member_id === memberId &&
        (t.remarks.includes(`Loan issued (net of 3% service charge of ₱${(loan.loan_amount * 0.03).toLocaleString('en-US', {minimumFractionDigits: 2})})`) ||
         t.remarks.includes(`Loan payment for loan ID: ${loanId.substring(0,8)}...`))
    ).sort((a, b) => new Date(a.date) - new Date(b.date));


    if (loanTransactions.length === 0) {
        ledgerBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">No transactions found for this loan.</td></tr>`;
        loanLedgerModal.classList.add('is-open');
        return;
    }

    loanTransactions.forEach(t => {
        const typeClass = t.type === 'Loan Issued' ? 'text-orange-600' : 'text-blue-600';
        ledgerBody.innerHTML += `
                    <tr>
                        <td class="p-3">${t.date}</td>
                        <td class="p-3 font-bold ${typeClass}">${t.type}</td>
                        <td class="p-3 text-right">₱${Math.abs(t.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        <td class="p-3 text-gray-600">${t.remarks}</td>
                    </tr>
                `;
    });
    loanLedgerModal.classList.add('is-open');
}

