/// <reference path="./video-frame.d.ts" />

import * as tf from "@tensorflow/tfjs";
// import * as tf from "@tensorflow/tfjs-node";
import { Float32 } from "./float_point_like_cpp";
import { Rank } from "@tensorflow/tfjs-core";
import { Atom, TypeInfo } from "./grid_types";
import * as fs from "fs";

export class GridMaker {
    private resolution: Float32;
    private dimension: number;
    private radiusMultiple: Float32;
    private gaussianResolution: Float32;
    private gridOrigin: { x: Float32; y: Float32; z: Float32 } | null = null;
    private center: { x: Float32; y: Float32; z: Float32 } | null = null;

    constructor(
        resolution: number,
        dimension: number,
        radiusMultiple = 1.5,
        gaussianResolution = 0.5,
        center?: { x: number; y: number; z: number }
    ) {
        this.resolution = new Float32(resolution);
        this.dimension = dimension;
        this.radiusMultiple = new Float32(radiusMultiple);
        this.gaussianResolution = new Float32(gaussianResolution);
        if (center) {
            this.center = {
                x: new Float32(center.x),
                y: new Float32(center.y),
                z: new Float32(center.z),
            };
        }
    }

    makeGrid(atoms: Atom[], typeInfo: TypeInfo[]): tf.Tensor4D {
        const gridCenter = this.center || this.calculateGridCenter(atoms);
        this.gridOrigin = {
            x: Float32.subtract(
                gridCenter.x,
                Float32.multiply(
                    new Float32(this.dimension / 2),
                    this.resolution
                )
            ),
            y: Float32.subtract(
                gridCenter.y,
                Float32.multiply(
                    new Float32(this.dimension / 2),
                    this.resolution
                )
            ),
            z: Float32.subtract(
                gridCenter.z,
                Float32.multiply(
                    new Float32(this.dimension / 2),
                    this.resolution
                )
            ),
        };

        const grid: tf.TensorBuffer<Rank.R4> = tf.buffer(
            [typeInfo.length, this.dimension, this.dimension, this.dimension],
            "float32"
        ) as tf.TensorBuffer<Rank.R4>;

        atoms.forEach((atom) => {
            const typeData = typeInfo[atom.type];
            const radius = Float32.multiply(
                new Float32(typeData.radius),
                this.radiusMultiple
            );
            this.addAtomToGrid(atom, radius, this.gridOrigin, grid);
        });

        return grid.toTensor() as tf.Tensor4D;
    }

    exportGridChannelToDX(
        grid: tf.Tensor4D,
        channel: number,
        filename: string
    ): void {
        if (!this.gridOrigin) {
            throw new Error(
                "Grid origin is not set. Make sure to call makeGrid before exporting."
            );
        }

        const [numChannels, dimX, dimY, dimZ] = grid.shape;

        if (channel < 0 || channel >= numChannels) {
            throw new Error(
                `Invalid channel number. Must be between 0 and ${
                    numChannels - 1
                }.`
            );
        }

        const gridData = grid
            .slice([channel, 0, 0, 0], [1, dimX, dimY, dimZ])
            .reshape([dimX, dimY, dimZ]);
        const gridValues = gridData.dataSync();

        const header = `object 1 class gridpositions counts ${dimX} ${dimY} ${dimZ}
origin ${this.gridOrigin.x.toNumber()} ${this.gridOrigin.y.toNumber()} ${this.gridOrigin.z.toNumber()}
delta ${this.resolution.toNumber()} 0 0
delta 0 ${this.resolution.toNumber()} 0
delta 0 0 ${this.resolution.toNumber()}
object 2 class gridconnections counts ${dimX} ${dimY} ${dimZ}
object 3 class array type double rank 0 items ${dimX * dimY * dimZ} data follows
`;

        let dxContent = header;

        for (let i = 0; i < gridValues.length; i++) {
            dxContent += gridValues[i].toFixed(6) + " ";
            if ((i + 1) % 3 === 0) {
                dxContent += "\n";
            }
        }

        fs.writeFileSync(filename, dxContent);
        console.log(`DX file exported to ${filename}`);
    }

    private calculateGridCenter(atoms: Atom[]): {
        x: Float32;
        y: Float32;
        z: Float32;
    } {
        let sumX = new Float32(0);
        let sumY = new Float32(0);
        let sumZ = new Float32(0);

        atoms.forEach((atom) => {
            sumX = Float32.add(sumX, new Float32(atom.x));
            sumY = Float32.add(sumY, new Float32(atom.y));
            sumZ = Float32.add(sumZ, new Float32(atom.z));
        });

        const count = new Float32(atoms.length);
        return {
            x: Float32.divide(sumX, count),
            y: Float32.divide(sumY, count),
            z: Float32.divide(sumZ, count),
        };
    }

    private addAtomToGrid(
        atom: Atom,
        radius: Float32,
        gridOrigin: { x: Float32; y: Float32; z: Float32 },
        grid: tf.TensorBuffer<Rank.R4>
    ) {
        const radiusGridUnits = Float32.divide(radius, this.resolution);
        const minX = Math.max(
            0,
            Math.floor(
                Float32.subtract(
                    Float32.divide(
                        Float32.subtract(new Float32(atom.x), gridOrigin.x),
                        this.resolution
                    ),
                    radiusGridUnits
                ).toNumber()
            )
        );
        const maxX = Math.min(
            this.dimension - 1,
            Math.ceil(
                Float32.add(
                    Float32.divide(
                        Float32.subtract(new Float32(atom.x), gridOrigin.x),
                        this.resolution
                    ),
                    radiusGridUnits
                ).toNumber()
            )
        );
        const minY = Math.max(
            0,
            Math.floor(
                Float32.subtract(
                    Float32.divide(
                        Float32.subtract(new Float32(atom.y), gridOrigin.y),
                        this.resolution
                    ),
                    radiusGridUnits
                ).toNumber()
            )
        );
        const maxY = Math.min(
            this.dimension - 1,
            Math.ceil(
                Float32.add(
                    Float32.divide(
                        Float32.subtract(new Float32(atom.y), gridOrigin.y),
                        this.resolution
                    ),
                    radiusGridUnits
                ).toNumber()
            )
        );
        const minZ = Math.max(
            0,
            Math.floor(
                Float32.subtract(
                    Float32.divide(
                        Float32.subtract(new Float32(atom.z), gridOrigin.z),
                        this.resolution
                    ),
                    radiusGridUnits
                ).toNumber()
            )
        );
        const maxZ = Math.min(
            this.dimension - 1,
            Math.ceil(
                Float32.add(
                    Float32.divide(
                        Float32.subtract(new Float32(atom.z), gridOrigin.z),
                        this.resolution
                    ),
                    radiusGridUnits
                ).toNumber()
            )
        );

        for (let i = minX; i <= maxX; i++) {
            for (let j = minY; j <= maxY; j++) {
                for (let k = minZ; k <= maxZ; k++) {
                    const x = Float32.add(
                        gridOrigin.x,
                        Float32.multiply(new Float32(i), this.resolution)
                    );
                    const y = Float32.add(
                        gridOrigin.y,
                        Float32.multiply(new Float32(j), this.resolution)
                    );
                    const z = Float32.add(
                        gridOrigin.z,
                        Float32.multiply(new Float32(k), this.resolution)
                    );

                    const value = this.calculateDensity(
                        atom,
                        { x, y, z },
                        radius
                    );
                    grid.set(
                        Float32.add(
                            new Float32(grid.get(atom.type, i, j, k)),
                            value
                        ).toNumber(),
                        atom.type,
                        i,
                        j,
                        k
                    );
                }
            }
        }
    }

    private calculateDensity(
        atom: Atom,
        point: { x: Float32; y: Float32; z: Float32 },
        radius: Float32
    ): Float32 {
        const distSq = Float32.add(
            Float32.add(
                Float32.pow(Float32.subtract(new Float32(atom.x), point.x), 2),
                Float32.pow(Float32.subtract(new Float32(atom.y), point.y), 2)
            ),
            Float32.pow(Float32.subtract(new Float32(atom.z), point.z), 2)
        );
        const dist = Float32.sqrt(distSq);

        if (
            Float32.subtract(
                dist,
                Float32.multiply(radius, this.radiusMultiple)
            ).toNumber() > 0
        ) {
            return new Float32(0);
        } else if (
            Float32.subtract(
                dist,
                Float32.multiply(radius, this.gaussianResolution)
            ).toNumber() <= 0
        ) {
            return Float32.exp(
                Float32.multiply(
                    new Float32(-2),
                    Float32.divide(distSq, Float32.pow(radius, 2))
                )
            );
        } else {
            const dr = Float32.divide(dist, radius);
            const A = Float32.multiply(
                Float32.exp(
                    Float32.multiply(
                        new Float32(-2),
                        Float32.pow(this.gaussianResolution, 2)
                    )
                ),
                Float32.multiply(
                    new Float32(4),
                    Float32.pow(this.gaussianResolution, 2)
                )
            );
            const B = Float32.multiply(
                Float32.exp(
                    Float32.multiply(
                        new Float32(-2),
                        Float32.pow(this.gaussianResolution, 2)
                    )
                ),
                Float32.add(
                    Float32.multiply(new Float32(-4), this.gaussianResolution),
                    Float32.multiply(
                        new Float32(-8),
                        Float32.pow(this.gaussianResolution, 3)
                    )
                )
            );
            const C = Float32.multiply(
                Float32.exp(
                    Float32.multiply(
                        new Float32(-2),
                        Float32.pow(this.gaussianResolution, 2)
                    )
                ),
                Float32.add(
                    Float32.add(
                        Float32.multiply(
                            new Float32(4),
                            Float32.pow(this.gaussianResolution, 4)
                        ),
                        Float32.multiply(
                            new Float32(4),
                            Float32.pow(this.gaussianResolution, 2)
                        )
                    ),
                    new Float32(1)
                )
            );
            const q = Float32.add(
                Float32.multiply(Float32.add(Float32.multiply(A, dr), B), dr),
                C
            );
            return Float32.max(q, new Float32(0));
        }
    }
}
