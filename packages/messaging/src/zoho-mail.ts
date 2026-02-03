// Servicio de Integración con Zoho Mail API

export interface ZohoEmailAccount {
  emailId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  password: string;
  role: 'USER' | 'ADMIN';
  quota?: number; // Quota en MB
}

export interface ZohoApiResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export class ZohoMailService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken?: string;
  private domain: string; // Dominio base (ej: autoplataforma.com)
  private organizationId: string; // ID de la organización en Zoho

  constructor(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    domain: string,
    organizationId: string
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.domain = domain;
    this.organizationId = organizationId;
  }

  /**
   * Obtiene un access token usando refresh token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      this.accessToken = data.access_token;

      if (!this.accessToken) {
        throw new Error('Access token no recibido de Zoho');
      }

      return this.accessToken;
    } catch (error) {
      throw new Error(`Error getting Zoho access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Crea un nuevo email account en Zoho Mail
   */
  async createEmailAccount(account: ZohoEmailAccount): Promise<ZohoApiResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const emailParts = account.email.split('@');
      const emailUser = emailParts[0];
      const emailDomain = emailParts[1] || this.domain;

      const response = await fetch(
        `https://mail.zoho.com/api/accounts/${this.organizationId}/users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userName: emailUser,
            password: account.password,
            firstName: account.firstName,
            lastName: account.lastName,
            displayName: account.displayName || `${account.firstName} ${account.lastName}`,
            role: account.role,
            domainName: emailDomain,
            quota: account.quota || 10240, // 10GB por defecto
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Failed to create email account',
          },
        };
      }

      return {
        success: true,
        data: {
          emailId: data.data?.userId || data.userId,
          email: account.email,
          zohoEmailId: data.data?.userId || data.userId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error creating email account',
        },
      };
    }
  }

  /**
   * Suspende un email account en Zoho Mail
   */
  async suspendEmailAccount(emailId: string): Promise<ZohoApiResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://mail.zoho.com/api/accounts/${this.organizationId}/users/${emailId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'INACTIVE',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Failed to suspend email account',
          },
        };
      }

      return {
        success: true,
        data: { emailId, status: 'suspended' },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error suspending email account',
        },
      };
    }
  }

  /**
   * Reactiva un email account en Zoho Mail
   */
  async activateEmailAccount(emailId: string): Promise<ZohoApiResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://mail.zoho.com/api/accounts/${this.organizationId}/users/${emailId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'ACTIVE',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Failed to activate email account',
          },
        };
      }

      return {
        success: true,
        data: { emailId, status: 'active' },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error activating email account',
        },
      };
    }
  }

  /**
   * Elimina un email account en Zoho Mail
   */
  async deleteEmailAccount(emailId: string): Promise<ZohoApiResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://mail.zoho.com/api/accounts/${this.organizationId}/users/${emailId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Failed to delete email account',
          },
        };
      }

      return {
        success: true,
        data: { emailId, status: 'deleted' },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error deleting email account',
        },
      };
    }
  }

  /**
   * Cambia la contraseña de un email account
   */
  async resetPassword(emailId: string, newPassword: string): Promise<ZohoApiResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://mail.zoho.com/api/accounts/${this.organizationId}/users/${emailId}/password`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Failed to reset password',
          },
        };
      }

      return {
        success: true,
        data: { emailId, passwordChanged: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error resetting password',
        },
      };
    }
  }

  /**
   * Crea un alias de email
   */
  async createEmailAlias(emailId: string, alias: string): Promise<ZohoApiResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://mail.zoho.com/api/accounts/${this.organizationId}/users/${emailId}/aliases`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alias: alias,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Failed to create email alias',
          },
        };
      }

      return {
        success: true,
        data: { emailId, alias },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error creating email alias',
        },
      };
    }
  }
}

