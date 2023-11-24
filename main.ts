import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack, AzurermBackend } from "cdktf";
import { AzurermProvider } from "./.gen/providers/azurerm/provider";

/* The line `import { ContainerApp } from "./.gen/providers/azurerm/container-app";` is importing the
`ContainerApp` class from the `container-app` module in the `azurerm` provider. This class is used
to create and manage Azure Container Apps in the Terraform configuration. */
import { ContainerApp } from "./.gen/providers/azurerm/container-app";
import { ContainerAppEnvironment } from "@cdktf/provider-azurerm/lib/azurerm-provider";
import { DataAzurermContainerRegistry } from "./.gen/providers/azurerm/data-azurerm-container-registry";
import { LogAnalyticsWorkspace } from "./.gen/providers/azurerm/log-analytics-workspace";
import { ResourceGroup } from "./.gen/providers/azurerm/resource-group";
import { RoleAssignment } from "./.gen/providers/azurerm/role-assignment";
import { UserAssignedIdentity } from "./.gen/providers/azurerm/user-assigned-identity";


class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);
    new AzurermBackend(this, {
      containerName: "tfstate",
      key: "terraform.tfstate",
      resourceGroupName: "tfstateRG01",
      storageAccountName: "tfstate011072135289",
    });
    /*The following providers are missing schema information and might need manual adjustments to synthesize correctly: hashicorp/azurerm.
    For a more precise conversion please use the --provider flag in convert.*/
    new AzurermProvider(this, "azurerm", {
      features: {},
    });

    const rg = new ResourceGroup(this, "rg", {
      location: "eastus",
      name: "devops-task-rg",
    });

    const containerapp = new UserAssignedIdentity(this, "containerapp", {
      location: rg.location,
      name: "containerappmi",
      resourceGroupName: rg.name,
    });

    const acr = new DataAzurermContainerRegistry(this, "acr", {
      name: "devopstask001",
      resourceGroupName: "RG01",
    });

    const loganalytics = new LogAnalyticsWorkspace(this, "loganalytics", {
      location: rg.location,
      name: "devops-task-la",
      resourceGroupName: rg.name,
      retentionInDays: 30,
      sku: "PerGB2018",
    });
    const azurermRoleAssignmentContainerapp = new RoleAssignment(
      this,
      "containerapp_5",
      {
        dependsOn: [containerapp],
        principalId: containerapp.principalId,
        roleDefinitionName: "acrpull",
        scope: acr.id,
      }
    );
    /*This allows the Terraform resource name to match the original name. You can remove the call if you don't need them to match.*/
    azurermRoleAssignmentContainerapp.overrideLogicalId("containerapp");
    const containerappenv = new ContainerAppEnvironment(
      this,
      "containerappenv",
      {
        location: rg.location,
        log_analytics_workspace_id: loganalytics.id,
        name: "devops-task-containerappenv",
        resource_group_name: rg.name,
      }
    );
    const azurermContainerAppContainerapp = new ContainerApp(
      this,
      "containerapp_7",
      {
        container_app_environment_id: containerappenv.id,
        identity: [
          {
            identity_ids: [containerapp.id],
            type: "UserAssigned",
          },
        ],
        ingress: [
          {
            allow_insecure_connections: true,
            external_enabled: true,
            target_port: 8000,
            traffic_weight: [
              {
                latest_revision: true,
                percentage: 100,
              },
            ],
          },
        ],
        name: "devops-task-app",
        registry: [
          {
            identity: containerapp.id,
            server: acr.loginServer,
          },
        ],
        resource_group_name: rg.name,
        revision_mode: "Multiple",
        template: [
          {
            container: [
              {
                cpu: 0.25,
                image: "${" + acr.loginServer + "}/django-todolist:v2",
                memory: "0.5Gi",
                name: "firstcontainerappacracr",
              },
            ],
          },
        ],
      }
    );
    /*This allows the Terraform resource name to match the original name. You can remove the call if you don't need them to match.*/
    azurermContainerAppContainerapp.overrideLogicalId("containerapp");
    new TerraformOutput(this, "azurerm_container_app_url", {
      value: azurermContainerAppContainerapp.latestRevisionFqdn,
    });

  }
}

const app = new App();
new MyStack(app, "juniorDevopsChallenge");
app.synth();
