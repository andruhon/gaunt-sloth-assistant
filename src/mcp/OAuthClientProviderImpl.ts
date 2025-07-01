import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import express from 'express';
import * as crypto from 'crypto';
import { platform } from 'node:os';
import { execSync } from 'node:child_process';
import { AddressInfo } from 'net';
import { displayInfo } from '#src/consoleUtils.js';
import { StreamableHTTPConnection } from '@langchain/mcp-adapters';

interface OAuthClientProviderConfig {
  redirectUrl: string;
}

export class OAuthClientProviderImpl implements OAuthClientProvider {
  // TODO refactor all storage things to be stored on FS in home user dir
  private tokensStorage?: string;
  private codeVerifierStorage?: string;
  // TODO save this one as json
  private clientInformationStorage?: OAuthClientInformationFull;

  private config: OAuthClientProviderConfig;
  private innerState: string;

  constructor(config: OAuthClientProviderConfig) {
    this.config = config as OAuthClientProviderConfig;
    this.innerState = crypto.randomUUID();
    if (!this.config.redirectUrl) {
      new Error('No redirect URL provided');
    }
    displayInfo(`Using redirect URL: ${this.config.redirectUrl}`);
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

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.tokensStorage = JSON.stringify(tokens);
  }

  tokens(): OAuthTokens | undefined {
    return this.tokensStorage ? JSON.parse(this.tokensStorage) : undefined;
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
      // TODO need to sanitize the url in the case it has bad stuff
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

export async function createAuthProviderAndAuthenticate(
  mcpServer: StreamableHTTPConnection
): Promise<OAuthClientProviderImpl> {
  const { port, codePromise } = await createOAuthRedirectServer('/oauth-callback');
  const authProvider = new OAuthClientProviderImpl({
    redirectUrl: `http://127.0.0.1:${port}/oauth-callback`,
  });
  const outcome = await auth(authProvider, { serverUrl: mcpServer.url });
  if (outcome == 'REDIRECT') {
    const authorizationCode = await codePromise;
    await auth(authProvider, { serverUrl: mcpServer.url, authorizationCode });
  } else if (outcome == 'AUTHORIZED') {
    displayInfo('Authorized');
  } else {
    throw new Error(`Unexpected Auth outcome: ${outcome}`);
  }
  return authProvider;
}

export function createOAuthRedirectServer(
  path: string,
  portParam: number = 0
): Promise<{
  port: number;
  codePromise: Promise<string>;
}> {
  const redirectApp = express();
  return new Promise((resolve, reject) => {
    const codePromise = new Promise<string>((resolveCode, rejectCode) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redirectApp.get(path, (req: any, res: any) => {
        const code = req.query.code as string | undefined;
        if (!code) {
          res.status(400).send('Error: No auth code received');
          rejectCode('Error: No auth code received');
          return;
        }
        res.send(`<div style="height: 80vh;text-align: center;display: flex;justify-content: center;align-items: center;">
            <div>
                <h1>Auth successful!</h1>
                You may close this window and return to the Gaunt Sloth.
                <div>
                    <img src="data:image/bmp;base64,Qk02AwAAAAAAADYAAAAoAAAAEAAAABAAAAABABgAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAnD98ZBtDTQ8sey9YOQobRA8nZx9OdyxahzZrMwERdCtShjZqLQUVLwgZKwUWKQYXsFCRq06KciJPnEh/n0GEmjuClDl9lzl/uFGglz56dChOm0h0SBInLgQVKwgZKgUVgzZchDRfqEeLsUmavFWjvV6joEGFizFvsU+Yw2CowWCiu1qdbCRNKgEQMAofMAcebSRIgC9bt1KdqEqNnD6BokGJqEaOvVmjqEWMu12ftFeYwGCjpUOMUxc8KQIRLAQWhjVmo0qGs1CYqEmOqEmPmjyArk2UrEyQr02TsU2WwV6pvF2eo0CKlDl+OgsiJwQSijZthS9qnDuAo0GFqESMmz2BijZtpUOLnT2CuVicyWmtsVCUjDh0p0KQbiVYJAQSkzx3kzZ7iS5rv2mn3Y3Gq0+Pgi1laCFOfyxmmTx/slCVmT55eihemzyGjTd6NwgfgSxokzl9qkuY4pLR+Lvg1H3EjTRzZB1IjTV3cCNWmjmAgC1diCxpjC1ulDd8RhAtdihbljl/vmK1v2WuuWGgtVWdjDVwgS5ldCVZcydckjl5kzh3ynGwxHOooT6DSA8sQQwkpUeTyGrBlTp8eCNZkzh1rEeSmDx9ZB9JcyNYkzh2tlek5pjT8q3bqU2PPQokJgEPhTVxy2nBkDd6kDV2qEaOwGOvvWGxuViqoUSNlDd6nj6FvmKq13zKnkiJMgUZKwUWPg4poUaOkzp+kTh7nkCExG60033Jym7C03zKsVOdiC9tjjR10W7IeThrKAAOMAUYJgUULgUZdCZdqkqYu1ersk+fvFyww2q4z3fDqUmXhy5ulTp/yWi/Txo6JgEPLgYZLQUXKQUVJwkaSxExq1GTxWW3t1SpsU+gv1mvnUOLjTJ3izh3dTRkJwEQKgQWLQYaLAgcLQUYLQYZLAERezZaiTtmXyFJgjp0ijt1iTlqOAsjNQ0pKQASJwUVKQYYLgUZLAQZLAgcLgUZMAUYZyVRfCthPQoiIQAJOgcgYyBLKAIRLAUZNwsoMQcfKAQV"
                         width="16" height="16">
                </div>
            </div>
        </div>`);
        resolveCode(code);
        if (server) {
          console.log('Cleaning auth redirect server...');
          server.close();
        }
      });
    });

    const server = redirectApp.listen(portParam, () => {
      const addressInfo = server.address() as AddressInfo;
      const port = addressInfo.port;
      displayInfo(`OAuth callback server listening at ${port}`);
      resolve({ port, codePromise });
    });

    server.on('error', (err) => {
      // If the server fails to start, reject the outer promise.
      reject(err);
    });
  });
}
