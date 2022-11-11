<template>
  <Table :tableData="lipinskiTableData" caption="Lipinski Properties" />
  <Table :tableData="otherTableData" caption="Other Properties" />
  <Table :tableData="countsTableData" caption="Counts" />
</template>
  
<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Table from "./Table/Table.vue";
import { ITableData } from "./Table/Types";

/**
 * MolProps component
 */
@Options({
  components: {
    Table,
  },
})
export default class MolProps extends Vue {
  @Prop({ default: "" }) smiles!: string;

  lipinskiTableData: ITableData = { headers: [], rows: [] };
  countsTableData: ITableData = { headers: [], rows: [] };
  otherTableData: ITableData = { headers: [], rows: [] };

  props = "";

  /**
   * Watch for changes in the smiles prop. Update the properties when the SMILES
   * string changes.
   */
  @Watch("smiles")
  onSmiles() {
    dynamicImports.rdkitjs.module
      .then((RDKitModule: any) => {
        var mol = RDKitModule.get_mol(this.smiles);
        var descriptors = JSON.parse(mol.get_descriptors());
        const descriptorsSorted = Object.keys(descriptors)
          .sort(function (a, b) {
            return a.localeCompare(b, undefined, { sensitivity: "base" });
          })
          .map(function (descriptor) {
            return [descriptor, descriptors[descriptor]];
          });

        // Some of the molecular desscriptors don't seem to be useful.
        const descriptorsFiltered = descriptorsSorted.filter((d: any[]) => {
          if (["Phi", "amw", "hallKierAlpha"].indexOf(d[0]) !== -1) {
            return false;
          }

          if (/^chi\d/.test(d[0])) {
            return false;
          }

          return !/^kappa\d/.test(d[0]);
        });

        // Correct some names and add occasional notes
        const descriptorsCorrected = descriptorsFiltered.map(
          (d: any[]): any[] => {
            let name = d[0];
            let value = d[1];
            let notes = "";

            switch (name) {
              case "CrippenClogP":
                name = "logP";
                notes = "Wildman-Crippen LogP. See JCICS 39 868-873 (1999)";
                break;
              case "exactmw":
                name = "Weight";
                break;
              case "lipinskiHBA":
                name = "HBA";
                notes =
                  "Total number of nitrogen and oxygen atoms. See Adv Drug Deliv Rev 46 3-26 (2001)";
                break;
              case "lipinskiHBD":
                name = "HBD";
                notes =
                  "Total number of N-H and O-H bonds. See Adv Drug Deliv Rev 46 3-26 (2001)";
                break;
              case "CrippenMR":
                name = "MR";
                notes =
                  "Wildman-Crippen molar refractivity. See JCICS 39 868-873 (1999)";
                break;
              case "FractionCSP3":
                name = "CSP3";
                notes = "Percentage of carbon atoms that are SP3 hybridized.";
                value = Math.round(value * 100).toString() + "%";
                break;
              case "labuteASA":
                name = "Surf";
                notes =
                  "Labute's approximate surface area. See J Mol Graph Mod 18 464-477 (2000)";
                break;
              case "tpsa":
                name = "TPSA";
                notes =
                  "Topological polar surface area. See J Med Chem 43 3714-3717 (2000)";
                break;
            }
            return [name, value, notes];
          }
        );

        // Pull out lipinski descriptors
        const lipinskiDescriptors = descriptorsCorrected.filter((d: any[]) => {
          return (
            ["logP", "Weight", "HBA", "HBD"].indexOf(
              d[0]
            ) !== -1
          );
        });

        // Count number lipinski violations
        let lipinskiViolations = 0;
        lipinskiDescriptors.forEach((d: any[]) => {
          if (d[0] === "logP" && d[1] > 5) {
            lipinskiViolations++;
          }
          if (d[0] === "Weight" && d[1] > 500) {
            lipinskiViolations++;
          }
          if (d[0] === "HBA" && d[1] > 10) {
            lipinskiViolations++;
          }
          if (d[0] === "HBD" && d[1] > 5) {
            lipinskiViolations++;
          }
        });
        lipinskiDescriptors.push([
          "Violations",
          lipinskiViolations,
          "A molecule is druglike if it has 0 or 1 Lipinski violations.",
        ]);

        // Pull out the counts
        const countsDescriptors = descriptorsCorrected.filter((d: any[]) => {
          return /^[Nn]um/.test(d[0]);
        });

        // Pull out the other descriptors
        const otherDescriptors = descriptorsCorrected.filter((d: any[]) => {
          return (
            !lipinskiDescriptors.includes(d) && !countsDescriptors.includes(d)
          );
        });

        // Map onto object, where keyes are first element, vals, are second.
        // const descriptorsObj = Object.fromEntries(descriptorsFiltered);

        this.lipinskiTableData =
          this.convertDescriptorsToTableData(lipinskiDescriptors);
        this.countsTableData =
          this.convertDescriptorsToTableData(countsDescriptors);
        this.otherTableData =
          this.convertDescriptorsToTableData(otherDescriptors);

        // : ITableData = {headers: [], rows: []};
        return;
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * Given a list of descriptors, convert to an ITableData object.
   *
   * @param {any[][]} descriptors  List of descriptors
   * @returns {ITableData}         Table data
   */
  convertDescriptorsToTableData(descriptors: any[][]): ITableData {
    const headers = descriptors.map((d: any[]) => {
      return { text: d[0], note: d[2] };
    });
    const row: { [key: string]: any } = {};
    for (let descriptor of descriptors) {
      row[descriptor[0] as string] = descriptor[1];
    }

    return { headers: headers, rows: [row] };
  }

  /**
   * mounted function
   */
  mounted() {
    this.onSmiles();
  }
}
</script>
  
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
