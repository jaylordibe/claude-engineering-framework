<?php

namespace Tests\Feature;

use App\Enums\AppPlatform;
use App\Models\AppVersion;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

// Feature tests hit the database through factories against a live test
// database. "Unit" and "Feature" split by subject here, not by isolation.
class AppVersionFeatureTest extends TestCase
{

    private string $resource = '/api/app-versions';

    #[Test]
    public function testCreateAppVersion(): void
    {
        $token = $this->loginSystemAdminUser();
        $payload = [
            'version' => fake()->unique()->numerify('##.##.##'),
            'description' => fake()->text(),
            'platform' => fake()->randomElement(AppPlatform::cases())->value,
            'releaseDate' => now()->millisecond(0)->toISOString(),
            'downloadUrl' => fake()->url(),
            'forceUpdate' => fake()->boolean()
        ];
        $response = $this->withToken($token)->post($this->resource, $payload);

        $response->assertCreated()->assertJson($payload);
    }

    #[Test]
    public function testGetPaginatedAppVersions(): void
    {
        $token = $this->loginSystemAdminUser();
        AppVersion::factory()->count(15)->create();
        $response = $this->withToken($token)->get($this->resource);

        $response->assertOk()->assertJsonStructure(['data', 'links', 'meta']);
    }

    #[Test]
    public function testGetLatestAppVersionByPlatformWithoutAToken(): void
    {
        /** @var AppVersion $appVersion */
        $appVersion = AppVersion::factory()->create([
            'release_date' => now()->addMonth()
        ]);
        $response = $this->get("{$this->resource}/latest?platform={$appVersion->platform->value}");

        $response->assertOk()->assertJson(['id' => $appVersion->id]);
    }

    #[Test]
    public function testDeleteAppVersion(): void
    {
        $token = $this->loginSystemAdminUser();
        $appVersion = AppVersion::factory()->create();
        $response = $this->withToken($token)->delete("{$this->resource}/{$appVersion->id}");

        $response->assertOk()->assertJsonStructure(['success']);
    }

}
