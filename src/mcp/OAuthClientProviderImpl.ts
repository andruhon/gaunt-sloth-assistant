import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import express from 'express';
import { log } from '#src/systemUtils.js';
import * as crypto from 'crypto';
import { platform } from 'node:os';
import { execSync } from 'node:child_process';

interface OAuthClientProviderConfig {
  redirectUrl: string;
}

export class OAuthClientProviderImpl implements OAuthClientProvider {
  private tokensStorage?: string;
  private codeVerifierStorage?: string;
  private clientInformationStorage?: OAuthClientInformationFull;
  private config: OAuthClientProviderConfig;
  private innerState: string;

  constructor(config: OAuthClientProviderConfig) {
    this.config = config as OAuthClientProviderConfig;
    this.innerState = crypto.randomUUID();
    if (!this.config.redirectUrl) {
      new Error('No redirect URL provided');
    }
    log(`Using redirect URL: ${this.config.redirectUrl}`);
  }

  state(): string | Promise<string> {
    return this.innerState;
  }

  get redirectUrl() {
    return this.config.redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.config.redirectUrl],
      client_name: 'Gaunt Sloth Assistant',
      client_uri: 'https://github.com/andruhon/gaunt-sloth-assistant',
      software_id: '1dd38b83-946b-4631-8855-66ee467bfd68',
      scope: 'mcp:read mcp:write',
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    };
  }

  saveClientInformation(clientInformation: OAuthClientInformationFull): Promise<void> {
    console.log('Saving client information', clientInformation);
    this.clientInformationStorage = clientInformation;
    return Promise.resolve();
  }

  async clientInformation(): Promise<OAuthClientInformationFull | undefined> {
    return Promise.resolve(this.clientInformationStorage);
  }

  // TODO save storage in real place
  tokens(): OAuthTokens | undefined {
    return this.tokensStorage ? JSON.parse(this.tokensStorage) : undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.tokensStorage = JSON.stringify(tokens);
  }

  saveCodeVerifier(codeVerifier: string): Promise<void> {
    this.codeVerifierStorage = codeVerifier;
    return Promise.resolve();
  }

  codeVerifier(): Promise<string> {
    if (!this.codeVerifierStorage) {
      throw new Error('No code verifier stored');
    }
    return Promise.resolve(this.codeVerifierStorage);
  }

  async redirectToAuthorization(authUrl: URL): Promise<void> {
    console.log('Auth url: ', authUrl.toString());
    try {
      // TODO need to cleanup url in the case it has bad stuff
      console.log('Trying to open browser');
      if (platform().includes('win')) {
        execSync('start "" "' + authUrl.toString() + '"');
      } else {
        execSync('open ' + authUrl.toString());
      }
    } catch {
      console.log(`Failed to open browser please open ${authUrl.toString()} in your browser`);
    }
  }
}

export function createOAuthRedirectServer(path: string, port: number) {
  const redirectApp = express();
  let server: { close: () => void };
  return new Promise<string>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirectApp.get(path, (req: any, res: any) => {
      const code = req.query.code as string | undefined;
      if (!code) {
        res.status(400).send('Error: No auth code received');
        reject('Error: No auth code received');
        return;
      }

      res.send(`
        Auth successful!
        You may close this window and return to the Gaunt Sloth.
        <script>
          window.close();
        </script>
      `);
      resolve(code);
      if (server) {
        console.log('Cleaning auth redirect server...');
        server.close();
      }
    });

    server = redirectApp.listen(port, () => {
      log(`OAuth callback server listening at http://127.0.0.1:${port}`);
    });
  });
}
