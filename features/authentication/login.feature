@login @authentication
Feature: Login Page
  As a user
  I want to log in to the application
  So that I can access my account

  Background:
    Given I navigate to the login page

  @TC001 @smoke
  Scenario: Verify presence of input fields,login button and forget password link
    Then I should see a E-mail input field
    And I should see a Password input field
    And I should see a login button
    And I should see a forget password link

  @TC002
  Scenario: Verify email and password fields are empty by default
    Then the E-mail input field should be empty
    And the Password input field should be empty

  @TC003
  Scenario: Verify input types for email and password fields
    Then the "E-mail" input field should be of type "email"
    And the "Password" input field should be of type "password"

  @TC004
  Scenario: Verify forget password link redirects to correct page
    When I click on the forget password link
    Then I should be redirected to the forget password page

  @TC005 @TC006 @TC007
  Scenario Outline: Verify login with <Valid/Invalid> credentials
    When I enter "<E-mail>" in the E-mail input field
    And I enter "<Password>" in the Password input field
    And I click the login button
    Then I should see "<result>"

    Examples:
      | E-mail         | Password       | result                         | Valid/Invalid    |
      | VALID_EMAIL    | Abcd@1234      | UserName/Password is incorrect | Invalid Password |
      | abcd@gmail.com | VALID_PASSWORD | User not found                 | Invalid Email    |
      | VALID_EMAIL    | VALID_PASSWORD | User should be logged in       | Valid            |

  @TC008
  Scenario: Verify error message when email field is empty
    When the E-mail input field is empty
    And I enter "<Password>" in the Password input field
    And I click the login button
    Then I should see an error message "email" required

    Examples:
      | Password       |
      | VALID_PASSWORD |


  @TC009
  Scenario: Verify error message when password field is empty
    When I enter "<E-mail>" in the E-mail input field
    And the Password input field is empty
    And I click the login button
    Then I should see an error message "Password" required

    Examples:
      | E-mail      |
      | VALID_EMAIL |

  @TC010
  Scenario: Verify error message when both fields are empty
    When the E-mail input field is empty
    And the Password input field is empty
    When I click the login button
    Then I should see an error message "Both fields" required

  @TC011
  Scenario: Verify UI elements on the password recovery page
    Given I navigate to the password recovery page
    And I should see an email input field
    And I should see a SEND RESET LINK button
    And I should see a "Go back to login" link
    And I should see the company logo

  @TC012
  Scenario: Verify that the "Send Reset Link" button is disabled until the required field is filled
    Given I navigate to the password recovery page
    Then the Send Reset Link button should be disabled
    When I enter a valid email in the email input field
    Then the Send Reset Link button should be enabled

  @TC013
  Scenario: Verify error message when Email field is empty in password reset page
    Given I navigate to the password recovery page
    And I leave the Email Input field as blank in reset page
    Then I should see an error message "Email" required

  @TC014
  Scenario: Verify password masking functionality
    When I enter "password123" in the Password input field
    Then the password should be masked
    When I click on the "eye" icon
    Then the password should be visible

  @TC015
  Scenario: Verify the login API payload email and password
    When I enter "<E-mail>" in the E-mail input field
    And I enter "<password>" in the Password input field
    And I click the login button
    Then Verify the login API is triggered and its "<E-mail>",'<password>'

    Examples:
      | E-mail      | password       |
      | VALID_EMAIL | VALID_PASSWORD |

  @Token @TC016 @reusable
  Scenario: Verify User can be Logged In
    Given I log in with '<email>' and '<password>'

    Examples:
      | email       | password       |
      | VALID_EMAIL | VALID_PASSWORD |
