import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { VFS } from "@spt/utils/VFS";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import path from "path";
import { JsonUtil } from "@spt/utils/JsonUtil";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";

class EasyHideout implements IPostDBLoadMod {
    private config: any;
    private logger: ILogger;
    private databaseServer: DatabaseServer;
    private vfs: VFS;
    private jsonUtil: JsonUtil;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private DB: IDatabaseTables;

    public postDBLoad(container: DependencyContainer): void {
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        this.vfs = container.resolve<VFS>("VFS");
        this.jsonUtil = container.resolve<JsonUtil>("JsonUtil");

        this.config = this.jsonUtil.deserializeJson5(this.vfs.readFile(path.join(__dirname , "../config/config.json5")));
        this.DB = this.databaseServer.getTables();
     
        if (this.config["debug"]) {
            for (const key in this.config) {
                this.logger.info(`EasyHideout config: ${key}: ${this.config[key]}`);
            }
        }

        this.applyHideoutSettings()
        this.logger.logWithColor("EasyHideout: Mod loaded", LogTextColor.GREEN);
    }

    private applyHideoutSettings(): void {
        const itemMultiplier = this.config["itemMultiplier"];
        const hideout = this.DB.hideout;

        if (this.config["debug"]) {
            this.logger.logWithColor(`EasyHideout: Item multiplier: ${itemMultiplier}`, LogTextColor.GREEN);
        }

        // This is fun: Looping through each hideout upgrade, each hideout upgrade stage and its requirements
        for (const _i in hideout.areas) {
            const area = hideout.areas[_i];

            for (const _j in area.stages) {
                const stage = area.stages[_j];

                if (stage.requirements !== undefined && stage.requirements.length != 0) {
                    for (const _k in stage.requirements) {
                        const requirement = stage.requirements[_k];

                        // We only want to apply the multiplier to items that have a templateId.
                        if (requirement.type === "Item" && requirement.templateId !== undefined) {
                            // The next part makes sure, that at least 1 item is needed for the hideout upgrade
                            requirement.count = Math.max(Math.ceil(requirement.count * itemMultiplier), 1);

                            if (this.config["debug"]) {
                                this.logger.logWithColor(`EasyHideout: Changed item requirement: ${requirement.templateId} x${requirement.count} (was x${requirement.count / itemMultiplier})`, LogTextColor.GREEN);
                            }
                        }
                    }
                }
            }
        }
    }
}

module.exports = { mod: new EasyHideout() };
