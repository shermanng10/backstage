/*
 * Copyright 2020 Spotify AB
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

import {
  Entity,
  RELATION_OWNED_BY,
  RELATION_PART_OF,
  RELATION_PROVIDES_API,
} from '@backstage/catalog-model';
import { ApiProvider, ApiRegistry } from '@backstage/core';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { renderInTestApp } from '@backstage/test-utils';
import { waitFor } from '@testing-library/react';
import React from 'react';
import { ApiDocsConfig, apiDocsConfigRef } from '../../config';
import { ProvidedApisCard } from './ProvidedApisCard';

describe('<ProvidedApisCard />', () => {
  const apiDocsConfig: jest.Mocked<ApiDocsConfig> = {
    getApiDefinitionWidget: jest.fn(),
  } as any;
  const catalogApi: jest.Mocked<CatalogApi> = {
    getLocationById: jest.fn(),
    getEntityByName: jest.fn(),
    getEntities: jest.fn(),
    addLocation: jest.fn(),
    getLocationByEntity: jest.fn(),
    removeEntityByUid: jest.fn(),
  } as any;
  let Wrapper: React.ComponentType;

  beforeEach(() => {
    const apis = ApiRegistry.with(catalogApiRef, catalogApi).with(
      apiDocsConfigRef,
      apiDocsConfig,
    );

    Wrapper = ({ children }: { children?: React.ReactNode }) => (
      <ApiProvider apis={apis}>{children}</ApiProvider>
    );
  });

  afterEach(() => jest.resetAllMocks());

  it('shows empty list if no relations', async () => {
    const entity: Entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'my-name',
        namespace: 'my-namespace',
      },
      relations: [],
    };

    const { getByText } = await renderInTestApp(
      <Wrapper>
        <ProvidedApisCard entity={entity} />
      </Wrapper>,
    );

    expect(getByText(/Provided APIs/i)).toBeInTheDocument();
    expect(getByText(/No APIs provided by this entity/i)).toBeInTheDocument();
  });

  it('shows consumed APIs', async () => {
    const entity: Entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'my-name',
        namespace: 'my-namespace',
      },
      relations: [
        {
          target: {
            kind: 'API',
            namespace: 'my-namespace',
            name: 'target-name',
          },
          type: RELATION_PROVIDES_API,
        },
      ],
    };
    catalogApi.getEntityByName.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'API',
      metadata: {
        name: 'target-name',
        namespace: 'my-namespace',
      },
      spec: {
        type: 'openapi',
        lifecycle: 'production',
        definition: '...',
      },
      relations: [
        {
          type: RELATION_PART_OF,
          target: {
            kind: 'System',
            name: 'MySystem',
            namespace: 'default',
          },
        },
        {
          type: RELATION_OWNED_BY,
          target: {
            kind: 'Group',
            name: 'Test',
            namespace: 'default',
          },
        },
      ],
    });
    apiDocsConfig.getApiDefinitionWidget.mockReturnValue({
      type: 'openapi',
      title: 'OpenAPI',
      component: () => <div />,
    });

    const { getByText } = await renderInTestApp(
      <Wrapper>
        <ProvidedApisCard entity={entity} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByText(/Provided APIs/i)).toBeInTheDocument();
      expect(getByText(/target-name/i)).toBeInTheDocument();
      expect(getByText(/OpenAPI/)).toBeInTheDocument();
      expect(getByText(/MySystem/)).toBeInTheDocument();
      expect(getByText(/Test/i)).toBeInTheDocument();
      expect(getByText(/production/i)).toBeInTheDocument();
    });
  });
});