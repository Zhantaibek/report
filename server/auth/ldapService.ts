import ldap from 'ldapjs';
import { config } from '../config/index.js';

export interface LdapUser {
  login: string;
  email: string;
  name: string;
  position: string | null;
  phone: string | null;
  department_name: string | null;
  organization: string | null;
}

class LDAPService {
  private get url() {
    return config.ldap.url;
  }

  private get baseDN() {
    return config.ldap.baseDN;
  }

  private get bindDN() {
    return config.ldap.bindDN;
  }

  private get bindPassword() {
    return config.ldap.bindPassword;
  }

  private get userSearchBase() {
    return config.ldap.userSearchBase || this.baseDN;
  }

  private getDomainName(): string | null {
    if (!this.baseDN) return null;
    return this.baseDN
      .split(',')
      .filter((p) => p.startsWith('DC='))
      .map((p) => p.replace('DC=', ''))
      .join('.');
  }

  private decodeDN(dn: string): string {
    return dn.replace(/\\([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }

  private escapeFilter(str: string): string {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\5c')
      .replace(/\*/g, '\\2a')
      .replace(/\(/g, '\\28')
      .replace(/\)/g, '\\29')
      .replace(/\0/g, '\\00');
  }

  private parseEntryAttributes(entry: ldap.SearchEntry): Record<string, string | string[]> {
    return entry.pojo.attributes.reduce<Record<string, string | string[]>>((acc, attr) => {
      acc[attr.type] = attr.values.length === 1 ? attr.values[0] : attr.values;
      return acc;
    }, {});
  }

  private connect(): Promise<ldap.Client> {
    return new Promise((resolve, reject) => {
      if (!this.url) return reject(new Error('LDAP_URL is not configured'));

      const client = ldap.createClient({ url: this.url });
      client.on('error', (err) => reject(err));

      if (!this.bindDN || !this.bindPassword) {
        return reject(new Error('LDAP_BIND_DN and LDAP_BIND_PASSWORD are required'));
      }

      const domainName = this.getDomainName();
      const cnMatch = this.bindDN.match(/CN=([^,]+)/);
      const username = cnMatch ? cnMatch[1] : null;

      const bindAttempts = [
        { dn: this.bindDN, description: 'DN/UPN as configured' },
        { dn: username && domainName ? `${username}@${domainName}` : null, description: 'UPN' },
        {
          dn: username && domainName ? `${domainName.split('.')[0]}\\${username}` : null,
          description: 'domain\\user',
        },
      ].filter((a): a is { dn: string; description: string } => Boolean(a.dn));

      let i = 0;
      const tryBind = () => {
        if (i >= bindAttempts.length) {
          return reject(new Error('Service account bind failed'));
        }
        const attempt = bindAttempts[i];
        client.bind(attempt.dn, this.bindPassword, (err) => {
          if (err) {
            i += 1;
            return tryBind();
          }
          resolve(client);
        });
      };

      tryBind();
    });
  }

  async authenticate(login: string, password: string): Promise<LdapUser | null> {
    if (!this.baseDN) throw new Error('LDAP_BASE_DN is not configured');

    const client = await this.connect();
    const searchFilter = `(sAMAccountName=${this.escapeFilter(login)})`;

    const searchBases: string[] = [];
    if (this.userSearchBase && this.userSearchBase !== this.baseDN) {
      searchBases.push(this.userSearchBase);
      const cnUsersBase = this.userSearchBase.replace(/OU=Users/i, 'CN=Users');
      if (cnUsersBase !== this.userSearchBase) searchBases.push(cnUsersBase);
    }
    searchBases.push(this.baseDN);

    return new Promise((resolve, reject) => {
      let baseIndex = 0;
      let userDN: string | null = null;
      let userAttributes: Record<string, string | string[]> | null = null;

      const trySearch = (searchBase: string) => {
        client.search(
          searchBase,
          {
            filter: searchFilter,
            scope: 'sub',
            attributes: [
              'sAMAccountName',
              'mail',
              'userPrincipalName',
              'displayName',
              'cn',
              'title',
              'telephoneNumber',
              'department',
              'company',
            ],
          },
          (err, res) => {
            if (err) {
              if (err.message.includes('No Such Object') && baseIndex < searchBases.length - 1) {
                baseIndex += 1;
                return trySearch(searchBases[baseIndex]);
              }
              client.unbind();
              return reject(err);
            }

            userDN = null;
            userAttributes = null;

            res.on('searchEntry', (entry) => {
              userDN = entry.dn.toString();
              userAttributes = this.parseEntryAttributes(entry);
            });

            res.on('error', (searchErr) => {
              if (searchErr.message.includes('No Such Object') && baseIndex < searchBases.length - 1) {
                baseIndex += 1;
                return trySearch(searchBases[baseIndex]);
              }
              client.unbind();
              reject(searchErr);
            });

            res.on('end', () => {
              if (!userDN || !userAttributes) {
                if (baseIndex < searchBases.length - 1) {
                  baseIndex += 1;
                  return trySearch(searchBases[baseIndex]);
                }
                client.unbind();
                return reject(new Error(`User '${login}' not found in LDAP`));
              }

              client.unbind();

              const domainName = this.getDomainName();
              const decodedDN = this.decodeDN(userDN);
              const attrs = userAttributes;
              const samAccountName = String(attrs.sAMAccountName ?? login);

              const bindAttempts = [
                attrs.userPrincipalName ? String(attrs.userPrincipalName) : null,
                domainName ? `${samAccountName}@${domainName}` : null,
                decodedDN !== userDN ? decodedDN : null,
                userDN,
              ].filter(Boolean) as string[];

              let attemptIndex = 0;

              const tryUserBind = () => {
                if (attemptIndex >= bindAttempts.length) return resolve(null);

                const userClient = ldap.createClient({ url: this.url });
                userClient.bind(bindAttempts[attemptIndex], password, (bindErr) => {
                  if (bindErr) {
                    userClient.unbind();
                    attemptIndex += 1;
                    return tryUserBind();
                  }

                  const ldapUser: LdapUser = {
                    login: samAccountName,
                    email:
                      (attrs.mail ? String(attrs.mail) : null) ||
                      (attrs.userPrincipalName ? String(attrs.userPrincipalName) : null) ||
                      `${samAccountName}@domain.local`,
                    name:
                      (attrs.displayName ? String(attrs.displayName) : null) ||
                      (attrs.cn ? String(attrs.cn) : null) ||
                      samAccountName,
                    position: attrs.title ? String(attrs.title) : null,
                    phone: attrs.telephoneNumber ? String(attrs.telephoneNumber) : null,
                    department_name: attrs.department ? String(attrs.department) : null,
                    organization: attrs.company ? String(attrs.company) : null,
                  };

                  userClient.unbind();
                  resolve(ldapUser);
                });
              };

              tryUserBind();
            });
          }
        );
      };

      trySearch(searchBases[0]);
    });
  }
}

export const ldapService = new LDAPService();
