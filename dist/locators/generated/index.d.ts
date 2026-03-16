export declare const locators: {
    readonly authentication: {
        readonly login: {
            readonly emailInput: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly passwordInput: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly loginButton: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly forgotPasswordLink: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly visibilityIcon: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly emptyFieldError: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly siteChangeDropdown: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
        };
        readonly forgotPassword: {
            readonly emailInput: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly recoveryEmailInput: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly resetButton: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly resetLinkButton: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly backToLoginLink: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly dejouleLogo: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
            readonly smartjoulesLogo: {
                selector: string;
                strategy: "xpath";
                description: string;
            };
        };
    };
    readonly dashboard: {
        readonly header: {
            readonly logo: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly userMenu: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly userAvatar: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly notificationBell: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly notificationCount: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly searchInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly sidebar: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly toggleButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly dashboardLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly reportsLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly settingsLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly helpLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly overview: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly welcomeMessage: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly lastLoginTime: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly widgets: {
            readonly energyConsumption: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly costSavings: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly systemStatus: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly recentAlerts: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly quickActions: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly charts: {
            readonly energyChart: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly temperatureChart: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly chartLegend: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly chartTooltip: {
                selector: string;
                strategy: "css";
                description: string;
            };
            readonly dateRangePicker: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly alerts: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly alertItem: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly dismissButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly viewAllLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
    };
    readonly reports: {
        readonly list: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly searchInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly filterDropdown: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly sortDropdown: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly createButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly reportRow: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly pagination: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly emptyState: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly viewer: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly title: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly dateRange: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly downloadButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly printButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly shareButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly backButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly generator: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly reportTypeSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly startDateInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly endDateInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly siteSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly metricsCheckboxes: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly formatSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly generateButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly cancelButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly progressIndicator: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly schedule: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly frequencySelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly recipientsInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly enableToggle: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly saveButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly charts: {
            readonly energyUsageChart: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly costAnalysisChart: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly comparisonChart: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly exportChartButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
    };
    readonly settings: {
        readonly navigation: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly profileLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly securityLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly notificationsLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly preferencesLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly integrationsLink: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly profile: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly avatarUpload: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly avatarPreview: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly firstNameInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly lastNameInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly emailInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly phoneInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly timezoneSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly saveButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly cancelButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly security: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly currentPasswordInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly newPasswordInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly confirmPasswordInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly changePasswordButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly twoFactorToggle: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly twoFactorSetup: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly sessionsList: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly revokeSessionButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly revokeAllButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly notifications: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly emailNotificationsToggle: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly pushNotificationsToggle: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly alertsToggle: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly reportsToggle: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly digestFrequencySelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly saveButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly preferences: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly languageSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly themeSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly dateFormatSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly temperatureUnitSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly energyUnitSelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly currencySelect: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly saveButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
        readonly integrations: {
            readonly container: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly apiKeyDisplay: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly regenerateKeyButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly copyKeyButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly webhookUrlInput: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly webhookToggle: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly testWebhookButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
            readonly saveButton: {
                selector: string;
                strategy: "data-testid";
                description: string;
            };
        };
    };
};
export type LocatorDomains = keyof typeof locators;
export type AuthenticationPages = keyof typeof locators.authentication;
export type AuthenticationLoginElements = keyof typeof locators.authentication.login;
export type AuthenticationForgotPasswordElements = keyof typeof locators.authentication.forgotPassword;
export type DashboardPages = keyof typeof locators.dashboard;
export type DashboardHeaderElements = keyof typeof locators.dashboard.header;
export type DashboardSidebarElements = keyof typeof locators.dashboard.sidebar;
export type DashboardOverviewElements = keyof typeof locators.dashboard.overview;
export type DashboardWidgetsElements = keyof typeof locators.dashboard.widgets;
export type DashboardChartsElements = keyof typeof locators.dashboard.charts;
export type DashboardAlertsElements = keyof typeof locators.dashboard.alerts;
export type ReportsPages = keyof typeof locators.reports;
export type ReportsListElements = keyof typeof locators.reports.list;
export type ReportsViewerElements = keyof typeof locators.reports.viewer;
export type ReportsGeneratorElements = keyof typeof locators.reports.generator;
export type ReportsScheduleElements = keyof typeof locators.reports.schedule;
export type ReportsChartsElements = keyof typeof locators.reports.charts;
export type SettingsPages = keyof typeof locators.settings;
export type SettingsNavigationElements = keyof typeof locators.settings.navigation;
export type SettingsProfileElements = keyof typeof locators.settings.profile;
export type SettingsSecurityElements = keyof typeof locators.settings.security;
export type SettingsNotificationsElements = keyof typeof locators.settings.notifications;
export type SettingsPreferencesElements = keyof typeof locators.settings.preferences;
export type SettingsIntegrationsElements = keyof typeof locators.settings.integrations;
//# sourceMappingURL=index.d.ts.map