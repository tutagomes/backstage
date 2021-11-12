/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ResponseError } from '@backstage/errors';
import fetch from 'cross-fetch';
import * as uuid from 'uuid';
import {
  AuthorizeResult,
  AuthorizeRequest,
  AuthorizeResponse,
  AuthorizeRequestJSON,
  Identified,
} from './types/api';
import { DiscoveryApi } from './types/discovery';

/**
 * Options for authorization requests; currently only an optional auth token.
 * @public
 */
export type AuthorizeRequestOptions = {
  token?: string;
};

/**
 * An isomorphic client for requesting authorization for Backstage permissions.
 * @public
 */
export class PermissionClient {
  private readonly discoveryApi: DiscoveryApi;

  constructor(options: { discoveryApi: DiscoveryApi }) {
    this.discoveryApi = options.discoveryApi;
  }

  /**
   * Request authorization from the permission-backend for the given set of permissions.
   *
   * Authorization requests check that a given Backstage user can perform a protected operation,
   * potentially for a specific resource (such as a catalog entity). The Backstage identity token
   * should be included in the `options` if available.
   *
   * Permissions can be imported from plugins exposing them, such as `catalogEntityReadPermission`.
   *
   * The response will be either ALLOW or DENY when either the permission has no resourceType, or a
   * resourceRef is provided in the request. For permissions with a resourceType, CONDITIONAL may be
   * returned if no resourceRef is provided in the request. Conditional responses are intended only
   * for backends which have access to the data source for permissioned resources, so that filters
   * can be applied when loading collections of resources.
   * @public
   */
  async authorize(
    requests: AuthorizeRequest[],
    options?: AuthorizeRequestOptions,
  ): Promise<AuthorizeResponse[]> {
    const identifiedRequests: Identified<AuthorizeRequestJSON>[] = requests.map(
      request => ({
        id: uuid.v4(),
        permission: request.permission.toJSON(),
        resourceRef: request.resourceRef,
      }),
    );

    const permissionApi = await this.discoveryApi.getBaseUrl('permission');
    const response = await fetch(`${permissionApi}/authorize`, {
      method: 'POST',
      body: JSON.stringify(identifiedRequests),
      headers: {
        ...this.getAuthorizationHeader(options?.token),
        'content-type': 'application/json',
      },
    });
    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    const identifiedResponses = await response.json();
    this.assertValidResponses(identifiedRequests, identifiedResponses);

    const responsesById = identifiedResponses.reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {} as Record<string, Identified<AuthorizeResponse>>);

    return identifiedRequests.map(request => responsesById[request.id]);
  }

  private getAuthorizationHeader(token?: string): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private assertValidResponses(
    requests: Identified<AuthorizeRequestJSON>[],
    json: any,
  ): asserts json is Identified<AuthorizeResponse>[] {
    const responses = Array.isArray(json) ? json : [];
    const authorizedResponses: Identified<AuthorizeResponse>[] =
      responses.filter(
        (r: any): r is Identified<AuthorizeResponse> =>
          typeof r === 'object' &&
          typeof r.id === 'string' &&
          r.result in AuthorizeResult,
      );
    const responseIds = authorizedResponses.map(r => r.id);
    const hasAllRequestIds = requests.every(r => responseIds.includes(r.id));
    if (!hasAllRequestIds) {
      throw new Error(
        'Unexpected authorization response from permission-backend',
      );
    }
  }
}
