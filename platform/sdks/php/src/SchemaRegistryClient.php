<?php

declare(strict_types=1);

namespace DataMesh\SDK;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;

class SchemaRegistryClient
{
    private Client $http;

    public function __construct(string $url, array $options = [])
    {
        $config = [
            'base_uri' => rtrim($url, '/'),
            'timeout'  => 5.0,
            'headers'  => ['Content-Type' => 'application/vnd.schemaregistry.v1+json'],
        ];
        if (!empty($options['api_key'])) {
            $config['auth'] = [$options['api_key'], $options['api_secret'] ?? ''];
        }
        $this->http = new Client($config);
    }

    public function register(string $subject, array $schema, string $compatibility = 'FULL_TRANSITIVE'): int
    {
        $this->http->put("/config/{$subject}", ['json' => ['compatibility' => $compatibility]]);

        $response = $this->http->post(
            "/subjects/{$subject}/versions",
            ['json' => ['schema' => json_encode($schema), 'schemaType' => 'AVRO']]
        );

        return json_decode((string) $response->getBody(), true)['id'];
    }

    public function getLatestSchemaId(string $subject): int
    {
        $response = $this->http->get("/subjects/{$subject}/versions/latest");
        return json_decode((string) $response->getBody(), true)['id'];
    }

    public function checkCompatibility(string $subject, array $schema): bool
    {
        try {
            $response = $this->http->post(
                "/compatibility/subjects/{$subject}/versions/latest",
                ['json' => ['schema' => json_encode($schema), 'schemaType' => 'AVRO']]
            );
            return json_decode((string) $response->getBody(), true)['is_compatible'] ?? false;
        } catch (ClientException $e) {
            if ($e->getResponse()->getStatusCode() === 404) {
                return true; // no existing schema — compatible by default
            }
            throw $e;
        }
    }
}
